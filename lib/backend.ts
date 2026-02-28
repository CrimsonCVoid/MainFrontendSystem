import { SketchLine } from "./drawings";
import { Editor } from "./editor";
import { CFrame, segmentIntersection2D, Vector3 } from "./positioning";
import * as BABYLON from "@babylonjs/core";
import * as BABYLON_ADDONS from "@babylonjs/addons";

var ENV_KEY = "AIzaSyDUfrliF4ydB8G4JbQudiC4t8L39pG_E74"; // API KEY

var InchesInMeter = 39.3701;
var Scale = 111132 * InchesInMeter;
var R = 6378137; // Earth radius in meters (WGS84 approximate)

type CustomBackendType = {
    Raw: GRoofSegment,
    Length: number,
    dx: number,
    dy: number,
    CT: Vector3,
    Center: Vector3,
    P0: Vector3,
    P1: Vector3,
    Panels: any[],
}

function CalculateCorners(Data, v: GRoofSegment, LineCreation = false) {
    let Info: CustomBackendType = { Raw: v, Panels: [] };
    // console.log("INFO", InfoStoof);
    // v.center
    let CenterLAT = v.center.latitude * Math.PI / 180, CenterLON = v.center.longitude * Math.PI / 180;
    let NE_LAT = v.boundingBox.ne.latitude * Math.PI / 180, NE_LON = v.boundingBox.ne.longitude * Math.PI / 180;
    let SW_LAT = v.boundingBox.sw.latitude * Math.PI / 180, SW_LON = v.boundingBox.sw.longitude * Math.PI / 180;

    let dCenter_LAT = CenterLAT - Data.CenteredLAT0, dCenter_LON = CenterLON - Data.CenteredLON0;
    let dNE_LAT = NE_LAT - Data.CenteredLAT0, dNE_LON = NE_LON - Data.CenteredLON0;
    let dSW_LAT = SW_LAT - Data.CenteredLAT0, dSW_LON = SW_LON - Data.CenteredLON0;

    let _Center = [-R * dCenter_LAT * InchesInMeter, R * dCenter_LON * Data.CosCenteredLAT0 * InchesInMeter];
    let _NE = [-R * dNE_LAT * InchesInMeter, R * dNE_LON * Data.CosCenteredLAT0 * InchesInMeter];
    let _SW = [-R * dSW_LAT * InchesInMeter, R * dSW_LON * Data.CosCenteredLAT0 * InchesInMeter];

    let AX = v.pitchDegrees * Math.PI / 180;
    let AY = v.azimuthDegrees * Math.PI / 180;

    let dx = Info.dx = Math.sin(AY);
    let dy = Info.dy = Math.cos(AY);

    let s = Math.tan(AX);

    let PlaneHeightInches = v.planeHeightAtCenterMeters * InchesInMeter;

    let _NW = [_NE[0], _SW[1]];
    let _SE = [_SW[0], _NE[1]];

    // v.stats.areaMeters2


    // if (UseExisting) {
    // 	N = (Info.NE.X + Info.NW.X) / 2;
    // 	E = (Info.NE.Y + Info.SE.Y) / 2;
    // 	W = (Info.SW.Y + Info.NW.Y) / 2;
    // 	S = (Info.SW.X + Info.SE.X) / 2;
    // }

    let Center = new Vector3(_Center[0], _Center[1], PlaneHeightInches); // - s * ((Center - (E + W) / 2) * dx + (Center - (N + S) / 2) * dy));
    let NE = new Vector3(_NE[0], _NE[1], PlaneHeightInches); // - s * ((E - (E + W) / 2) * dx + (S - (N + S) / 2) * dy));
    let NW = new Vector3(_NW[0], _NW[1], PlaneHeightInches); // - s * ((W - (E + W) / 2) * dx + (S - (N + S) / 2) * dy));
    let SW = new Vector3(_SW[0], _SW[1], PlaneHeightInches); // - s * ((W - (E + W) / 2) * dx + (N - (N + S) / 2) * dy));
    let SE = new Vector3(_SE[0], _SE[1], PlaneHeightInches); // - s * ((E - (E + W) / 2) * dx + (N - (N + S) / 2) * dy));

    let CT = Info.CT = NE.Average(SW);
    Info.Center = Center;
    let Length = Info.Length = ((NE.x - SW.x) ** 2 + (NE.y - SW.y) ** 2) ** .5; // 200;
    let P0 = Info.P0 = Center.TranslateAdd(new Vector3(-dx * Length / 2, -dy * Length / 2));
    let P1 = Info.P1 = Center.TranslateAdd(new Vector3(dx * Length / 2, dy * Length / 2));

    if (LineCreation) {
        BABYLON.MeshBuilder.CreateLines("e", { points: [NE.XY.ToBabylonXZY(), SW.XY.ToBabylonXZY()] }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(0, 0, 1);
        // LabelMarker(NE.XY, "NE"); LabelMarker(SW.XY, "SW");

        BABYLON.MeshBuilder.CreateLines("e", { points: [NW.XY.ToBabylonXZY(), NE.XY.ToBabylonXZY(), SE.XY.ToBabylonXZY(), SW.XY.ToBabylonXZY(), NW.XY.ToBabylonXZY()] }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, 0, 1);
        // BABYLON.MeshBuilder.CreateLines("e", { points: [NW.XY.ToBabylonXZY(), SE.XY.ToBabylonXZY()] }, Scene).color = new BABYLON.Color3(1, 1, 0);


        BABYLON.MeshBuilder.CreateLines("e", { points: [CT.TranslateAdd(new Vector3(-dx * Length / 2, -dy * Length / 2)).XY.ToBabylonXZY(), CT.TranslateAdd(new Vector3(dx * Length / 2, dy * Length / 2)).XY.ToBabylonXZY()] }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, 1, 0);
        BABYLON.MeshBuilder.CreateLines("e", { points: [P0.XY.ToBabylonXZY(), P1.XY.ToBabylonXZY()] }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, .5, 0);
    }

    Info.NE = NE; Info.NW = NW; Info.SW = SW; Info.SE = SE;
    // Info.N = N; Info.E = E; Info.W = W; Info.S = S;
    // if (UseExisting) {
    // 	Info.InnerOuter[0] = Info[Info.InnerOuterKeys[0]];
    // 	Info.InnerOuter[1] = Info[Info.InnerOuterKeys[1]];
    // 	Info.InnerOuter[2] = Info[Info.InnerOuterKeys[2]];
    // 	Info.InnerOuter[3] = Info[Info.InnerOuterKeys[3]];
    // }
    return Info;
}

function RelationsCombine(List: any[], ID: any) {
    let Relations = List[ID];
    for (let RoofID of Relations) {
        let OtherRelations = List[RoofID];
        for (let OtherRoofID of OtherRelations) {
            if (!Relations.includes(OtherRoofID)) {
                Relations.push(OtherRoofID);
                RelationsCombine(List, OtherRoofID);
            }
        }
    }
}

export async function Test(Lat: number | string, Lon: number | string) {
    let URL = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${Lat}&location.longitude=${Lon}&key=${ENV_KEY}`;
    const response = await fetch(URL);
    const Data = await response.json() as GSolarData;
    if (response.status != 200) {
        // console.error('findClosestBuilding\n', content);
        throw Data;
    }
    // Data.solarPotential.buildingStats.areaMeters2
    // Data.solarPotential.wholeRoofStats.areaMeters2
    // Data.statisticalArea

    Editor.MapDebugging.SetMapCenter(Data.center.latitude, Data.center.longitude);

    Data.CenteredLAT0 = Data.center.latitude * Math.PI / 180;
    Data.CenteredLON0 = Data.center.longitude * Math.PI / 180;
    Data.SinCenteredLAT0 = Math.sin(Data.CenteredLAT0); Data.CosCenteredLAT0 = Math.cos(Data.CenteredLAT0);

    console.log("DATA", Data);

    let ConvertedRoofs: CustomBackendType[] = [];
    let SortIndex = [];

    let PITCH = 0;
    let AverageGlobalHeight = 0;
    let COUNT = Data.solarPotential.roofSegmentStats.length;

    for (let RoofID in Data.solarPotential.roofSegmentStats) {
        let Roof = Data.solarPotential.roofSegmentStats[RoofID];
        // const Idk = Data.solarPotential.solarPanelConfigs[0].roofSegmentSummaries[0];
        let Info = CalculateCorners(Data, Roof);
        ConvertedRoofs[RoofID] = Info;
        SortIndex.push(RoofID);
        PITCH += Roof.pitchDegrees;
        AverageGlobalHeight += Info.CT.z;
    }
    AverageGlobalHeight /= COUNT;

    // ConvertedRoofs.sort((a, b) => b.Raw.stats.areaMeters2 - a.Raw.stats.areaMeters2);

    SortIndex.sort((a: any, b: any) => ConvertedRoofs[b].Raw.pitchDegrees - ConvertedRoofs[a].Raw.pitchDegrees);
    // SortIndex.sort((a, b) => ConvertedRoofs[b].Raw.planeHeightAtCenterMeters - ConvertedRoofs[a].Raw.planeHeightAtCenterMeters);
    // SortIndex.sort((a, b) => ConvertedRoofs[b].Raw.stats.areaMeters2 - ConvertedRoofs[a].Raw.stats.areaMeters2);

    for (let Index of SortIndex) {
        let Roof = ConvertedRoofs[Index].Raw;
        console.log("ROOF", Index, Roof.pitchDegrees, Roof.planeHeightAtCenterMeters * InchesInMeter, Roof.stats.areaMeters2 * InchesInMeter * InchesInMeter / 144);
    }

    for (let PanelID in Data.solarPotential.solarPanels)
        ConvertedRoofs[Data.solarPotential.solarPanels[PanelID].segmentIndex].Panels.push(PanelID);





    let SIDES = [["NW", "NE", "NORTH"], ["NE", "SE", "EAST"], ["SE", "SW", "SOUTH"], ["SW", "NW", "WEST"]];

    // let TESTINGBS = [];
    let INTERSECTIONS: any[] = [];

    for (let RoofID1 in ConvertedRoofs) {
        let Info1 = ConvertedRoofs[RoofID1];
        let Roof1 = Info1.Raw;
        INTERSECTIONS[RoofID1] = INTERSECTIONS[RoofID1] ?? [];
        for (let RoofID2 in ConvertedRoofs) {
            if (+RoofID1 >= +RoofID2) continue;
            let Info2 = ConvertedRoofs[RoofID2];
            let Roof2 = Info2.Raw;
            INTERSECTIONS[RoofID2] = INTERSECTIONS[RoofID2] ?? [];

            let Bound = segmentIntersection2D(
                Info1.P0.XY.ToBabylonXZY(), Info1.P1.XY.ToBabylonXZY(),
                Info2.P0.XY.ToBabylonXZY(), Info2.P1.XY.ToBabylonXZY());
            if (Bound && (0 <= Bound.t1 && Bound.t1 <= 1 && 0 <= Bound.t2 && Bound.t2 <= 1)) {
                // let RELATION = { ID_1: RoofID1, ID_2: RoofID2, Intersecting: true };
                // TESTINGBS.push(RELATION);
                INTERSECTIONS[RoofID1].push(RoofID2);
                INTERSECTIONS[RoofID2].push(RoofID1);
                // Editor.ActiveEditor.LabelMarker(Bound.point, `${RoofID1}-${RoofID2} (${Bound.t1.toFixed(2)}, ${Bound.t2.toFixed(2)})`);
                // Editor.ActiveEditor.LabelMarker(Info1.Center.XY, RoofID1);
                // Editor.ActiveEditor.LabelMarker(Info2.Center.XY, RoofID2);
                // BABYLON.MeshBuilder.CreateLines("e", { points: [Info1.P0.ToBabylonXZY(), Info1.P1.ToBabylonXZY()] }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, 1, 0);
                // BABYLON.MeshBuilder.CreateLines("e", { points: [Info2.P0.ToBabylonXZY(), Info2.P1.ToBabylonXZY()] }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, 1, 0);
            }

            // let RELATION = { ID_1: RoofID1, ID_2: RoofID2, Intersections: [] };
            // TESTINGBS.push(RELATION);

            // for (let SIDE1 of SIDES) {
            //     for (let SIDE2 of SIDES) {
            //         let Bound = segmentIntersection2D(
            //             Info1[SIDE1[0]].XY.ToBabylonXZY(), Info1[SIDE1[1]].XY.ToBabylonXZY(),
            //             Info2[SIDE2[0]].XY.ToBabylonXZY(), Info2[SIDE2[1]].XY.ToBabylonXZY());

            //         // if (Bound) {
            //         //     // console.log(`${SIDE1[2]}-${SIDE2[2]} ATTEMPT`, Bound);
            //         //     // BABYLON.MeshBuilder.CreateLines("e", { points: [Bound.p1, Bound.p2] }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, 0, 1);
            //         //     // BABYLON.MeshBuilder.CreateLines("e", { points: [Bound.p3, Bound.p4] }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, 0, 1);
            //         //     Editor.ActiveEditor.LabelMarker(Bound.point, `${SIDE1[2]}-${SIDE2[2]} ATTEMPT`);
            //         // }
            //         if (Bound && (0 <= Bound.t1 && Bound.t1 <= 1 && 0 <= Bound.t2 && Bound.t2 <= 1)) {
            //             BABYLON.MeshBuilder.CreateLines("e", { points: [Bound.p1, Bound.p2] }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, 0, 1);
            //             BABYLON.MeshBuilder.CreateLines("e", { points: [Bound.p3, Bound.p4] }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, 0, 1);
            //             console.log(`${SIDE1[2]}-${SIDE2[2]} INTERSECTION`);
            //             RELATION.Intersections.push([SIDE1[2], SIDE2[2], Bound]);
            //             // Editor.ActiveEditor.LabelMarker(Bound.point, `${SIDE1[2]}-${SIDE2[2]} INTERSECTION`);
            //             if (RELATION.Intersections.length == 4) {
            //                 Editor.ActiveEditor.LabelMarker(Info1.CT.XY, `INTERSECTION`);
            //                 Editor.ActiveEditor.LabelMarker(Info2.CT.XY, `INTERSECTION`);
            //             }
            //         }
            //     }
            // };

            // let BoundEE = segmentIntersection2D(Info1.NE.XY, Info1.SE.XY, Info2.NE.XY, Info2.SE.XY);
            // if (BoundEE && (0 <= BoundEE.t1 && BoundEE.t1 <= 1 && 0 <= BoundEE.t2 && BoundEE.t2 <= 1)) {
            //     console.log("EAST-EAST INTERSECTION");
            //     // SketchRelations.Add(Sketch1.ID, "EAST", "INTERSECT", Sketch2.ID, "EAST", "INTERSECT", BoundEE);
            //     // console.log(S1I, S2I, BoundEE);
            // }
        }
    }

    let RawIntersections: any[][] = []; // INTERSECTIONS.map((IntersectingIDs: any[], ID: any) => IntersectingIDs.copyWithin(0, 0, IntersectingIDs.length));

    for (let RoofID in INTERSECTIONS) RawIntersections[RoofID] = INTERSECTIONS[RoofID].map(x => x);

    // Turns it into unoptimized groups.
    for (let IntersectingID in INTERSECTIONS) {
        RelationsCombine(INTERSECTIONS, IntersectingID);
        if (!INTERSECTIONS[IntersectingID].includes(IntersectingID))
            INTERSECTIONS[IntersectingID].push(IntersectingID);
    }

    let Groups = [];
    let RoofInGroup = [];

    let GroupID = -1;
    for (let RoofIDs of INTERSECTIONS) {
        let AllSameGroup = true;
        for (let RoofID of RoofIDs)
            if (Groups.findIndex(Group => Group.includes(RoofID)) != -1) AllSameGroup = false;
        if (!AllSameGroup) continue;
        let Group = [];
        GroupID++;
        for (let RoofID of RoofIDs) {
            Group.push(RoofID);
            RoofInGroup[RoofID] = GroupID;
        }
        Groups[GroupID] = Group;
    }




    let WIDTH = Data.solarPotential.panelWidthMeters / 2 * InchesInMeter, HEIGHT = Data.solarPotential.panelHeightMeters / 2 * InchesInMeter;
    let MinimumExtrusion, MaximumExtrusion;
    for (let RoofID in ConvertedRoofs) {
        let Info = ConvertedRoofs[RoofID];
        let Roof = Info.Raw;
        let Panels = Info.Panels;
        let CenterLAT = Roof.center.latitude * Math.PI / 180, CenterLON = Roof.center.longitude * Math.PI / 180;
        let dCenter_LAT = CenterLAT - Data.CenteredLAT0, dCenter_LON = CenterLON - Data.CenteredLON0;
        let ROOF_ROT = Roof.azimuthDegrees * Math.PI / 180;
        let RoofCF = CFrame.fromXYZ(-R * dCenter_LAT * InchesInMeter, Roof.planeHeightAtCenterMeters * InchesInMeter, R * dCenter_LON * Data.CosCenteredLAT0 * InchesInMeter).ToWorldSpace(CFrame.Angles(0, ROOF_ROT, 0));
        let Please = [];
        let ORIENT = "PORTRAIT";
        for (let PanelID of Panels) {
            let Panel = Data.solarPotential.solarPanels[PanelID];
            let CenterLAT = Panel.center.latitude * Math.PI / 180, CenterLON = Panel.center.longitude * Math.PI / 180;
            let dCenter_LAT = CenterLAT - Data.CenteredLAT0, dCenter_LON = CenterLON - Data.CenteredLON0;

            ORIENT = Panel.orientation;
            let ROT = (Panel.orientation == "PORTRAIT" ? Math.PI / 2 : 0) + ROOF_ROT;

            let PanelCF = CFrame.fromXYZ(-R * dCenter_LAT * InchesInMeter, Roof.planeHeightAtCenterMeters * InchesInMeter, R * dCenter_LON * Data.CosCenteredLAT0 * InchesInMeter).ToWorldSpace(CFrame.Angles(0, ROT, 0));
            let FL = PanelCF.ToWorldSpace(CFrame.fromXYZ(-WIDTH, 0, -HEIGHT));
            let FR = PanelCF.ToWorldSpace(CFrame.fromXYZ(WIDTH, 0, -HEIGHT));
            let BL = PanelCF.ToWorldSpace(CFrame.fromXYZ(-WIDTH, 0, HEIGHT));
            let BR = PanelCF.ToWorldSpace(CFrame.fromXYZ(WIDTH, 0, HEIGHT));
            // Please.push(RoofCF.ToObjectSpace(PanelCF).Position);

            Please.push(RoofCF.ToObjectSpace(FL).Position);
            Please.push(RoofCF.ToObjectSpace(FR).Position);
            Please.push(RoofCF.ToObjectSpace(BR).Position);
            Please.push(RoofCF.ToObjectSpace(BL).Position);

            // BABYLON.MeshBuilder.CreateLines("e", {
            //     points: [
            //         FL.Position.ToBabylon(),
            //         FR.Position.ToBabylon(),
            //         BR.Position.ToBabylon(),
            //         BL.Position.ToBabylon(),
            //         FL.Position.ToBabylon(),
            //     ]
            // }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, 1, 1);
        };

        let InterList = [];
        for (let InterID of RawIntersections[RoofID]) {
            let InterRoof = ConvertedRoofs[InterID];
            let P0 = RoofCF.ToObjectSpace(CFrame.fromVector3(InterRoof.P0.XZY)).Position;
            let P1 = RoofCF.ToObjectSpace(CFrame.fromVector3(InterRoof.P1.XZY)).Position;
            if (Math.abs(P0.x) < Math.abs(P1.x)) InterList.push(P0);
            if (Math.abs(P1.x) < Math.abs(P0.x)) InterList.push(P1);
            // if (Math.abs(P0.x) < Math.abs(P1.x)) Editor.ActiveEditor.LabelMarker(InterRoof.P0, `${RoofID}-${InterID}: P0 (${P0.x.toFixed(2)})`);
            // if (Math.abs(P1.x) < Math.abs(P0.x)) Editor.ActiveEditor.LabelMarker(InterRoof.P1, `${RoofID}-${InterID}: P1 (${P1.x.toFixed(2)})`);
        }
        InterList.sort((a, b) => Math.abs(a.x) - Math.abs(b.x));
        // Might only use this if nothing else is available. (Please.length == 0)
        if (Please.length == 0) {
            let FirstInter = InterList.at(0); if (FirstInter) Please.push(FirstInter);
        }
        // if (FirstInter) Editor.ActiveEditor.LabelMarker(RoofCF.ToWorldSpace(CFrame.fromVector3(FirstInter)).Position, "INTER");
        console.log("INTERLIST", InterList);

        if (Please.length == 0) {
            Info.Size = new Vector3(HEIGHT * 2, 0, 0);
            continue;
        }
        let Bounds = Vector3.Bounds(Please);
        Info.Size = Bounds[1].TranslateSub(Bounds[0]);
        let UnknownFactor = 1; // 2;
        Info.Size.x = Math.max(Math.abs(Info.Size.x) + (ORIENT == "PORTRAIT" ? HEIGHT : WIDTH) * 0, Math.abs(Bounds[0].x) * UnknownFactor, Math.abs(Bounds[1].x) * UnknownFactor); // * 2;
        MinimumExtrusion = MinimumExtrusion == null ? Info.Size.x : Math.min(MinimumExtrusion, Info.Size.x);
        MaximumExtrusion = MaximumExtrusion == null ? Info.Size.x : Math.max(MaximumExtrusion, Info.Size.x);

        // RawIntersections[RoofID] // USE TO FIGURE OUT POTENTIAL BOUNDS, IGNORE FURTHER, USE INNER.

        // Roof.Size.x += (ORIENT == "PORTRAIT" ? HEIGHT : WIDTH); // * 2;
        // console.log("PUH-LEASEEE", RoofID, Please, Info.Size.x / 2 / (ORIENT == "PORTRAIT" ? HEIGHT : WIDTH), Info.Size.z / 2 / (ORIENT == "PORTRAIT" ? WIDTH : HEIGHT));
        // console.log("PUH-LEASEEE", RoofID, Please, Info.Size.x / (ORIENT == "PORTRAIT" ? HEIGHT : WIDTH), Info.Size.z / (ORIENT == "PORTRAIT" ? WIDTH : HEIGHT));
    };

    console.log(RawIntersections, ConvertedRoofs, Groups, RoofInGroup); // TESTINGBS);

    let ExtrusionSort = [];
    for (let RoofID in ConvertedRoofs) ExtrusionSort.push(RoofID);
    ExtrusionSort.sort((a, b) => (ConvertedRoofs[b].Size.x - ConvertedRoofs[a].Size.x));
    console.log("EXTRUSIONS: ", ExtrusionSort);

    // for (let Roof of ConvertedRoofs) {
    //     console.log(Roof.Raw.pitchDegrees, Math.tan(Roof.Raw.pitchDegrees * Math.PI / 180) * 12);
    // }

    // Could use significant boundary intersections to handle this automagically.
    let CombineIntoSketches = [["4", "8", "5", "10"], ["0", "2", "1", "3"], ["7", "6", "9"]]; // ExtrusionSort.copyWithin(0, 0, ExtrusionSort.length);

    // for (let RoofID in ConvertedRoofs) {
    //     let Info = ConvertedRoofs[RoofID];
    //     let Roof = Info.Raw;
    // }

    // for (let GroupID in Groups) {
    //     let Group = Groups[GroupID];
    //     for (let RoofID of Group) {
    //         let Info = ConvertedRoofs[RoofID];
    //         let Roof = Info.Raw;
    //         let Connections = RawIntersections[RoofID];
    //         if (Connections.length == 2) {
    //             let OtherRoof1 = ConvertedRoofs[Connections[0]];
    //             let OtherRoof2 = ConvertedRoofs[Connections[1]];
    //             let Relative1 = (OtherRoof1.Raw.azimuthDegrees - Roof.azimuthDegrees + 180) % 360 - 180;
    //             let Relative2 = (OtherRoof2.Raw.azimuthDegrees - Roof.azimuthDegrees + 180) % 360 - 180;
    //             console.log("CHECK", RoofID, Relative1, Relative2);
    //             // let Organize = [OtherRoof1.Raw.azimuthDegrees, Info.Raw.azimuthDegrees, OtherRoof2.Raw.azimuthDegrees].sort((a, b) => a - b);
    //             // Organize[2] = (Organize[2] - Organize[0] + 180) % 180 - 180;
    //             // Organize[1] = (Organize[1] - Organize[0] + 180) % 180 - 180;
    //             // Organize[0] = 0;
    //             // console.log(Organize);
    //             // console.log("Added", RoofID, Organize[0] + Organize[1] + Organize[2]);

    //         }
    //         // CombineIntoSketches.push(Info);
    //     }
    // }

    let BoundsByRoof = [];

    for (let GroupID in CombineIntoSketches) {
        let Group = CombineIntoSketches[GroupID];
        for (let RoofID of Group) {
            let Info = ConvertedRoofs[RoofID];
            let Roof = Info.Raw;
            // let Connections = RawIntersections[RoofID]; // Could possibly use to determine groups or something?
            let CheapCF = CFrame.fromVector3(Info.Center.XZY).ToWorldSpace(CFrame.Angles(0, Roof.azimuthDegrees * Math.PI / 180, 0)); // .ToWorldSpace(CFrame.fromXYZ(Info.Size.x / 2, 0, 0));
            let BoundsList = [];
            for (let OtherID of Group) {
                let OtherInfo = ConvertedRoofs[OtherID];
                let OtherRoof = OtherInfo.Raw;
                let OtherCheapCF = CFrame.fromVector3(OtherInfo.Center.XZY).ToWorldSpace(CFrame.Angles(0, OtherRoof.azimuthDegrees * Math.PI / 180, 0)); // .ToWorldSpace(CFrame.fromXYZ(OtherInfo.Size.x / 2, 0, 0));

                let RUN = OtherInfo.Size.x / 2;
                let LENGTH = OtherInfo.Length / 2;
                let RISE = Math.sin(OtherRoof.pitchDegrees * Math.PI / 180) * RUN;
                // Editor.ActiveEditor.LabelMarker(OtherCheapCF.ToWorldSpace(CFrame.fromXYZ(RUN, RISE, LENGTH)).Position.XZY, `${OtherID}-TL`);
                // Editor.ActiveEditor.LabelMarker(OtherCheapCF.ToWorldSpace(CFrame.fromXYZ(RUN, RISE, -LENGTH)).Position.XZY, `${OtherID}-TR`);
                // Editor.ActiveEditor.LabelMarker(OtherCheapCF.ToWorldSpace(CFrame.fromXYZ(-RUN, -RISE, LENGTH)).Position.XZY, `${OtherID}-BL`);
                // Editor.ActiveEditor.LabelMarker(OtherCheapCF.ToWorldSpace(CFrame.fromXYZ(-RUN, -RISE, -LENGTH)).Position.XZY, `${OtherID}-BR`);
                // let TL = CheapCF.ToObjectSpace(OtherCheapCF.ToWorldSpace(CFrame.fromXYZ(OtherInfo.Size.x / 2, 0, OtherInfo.Length / 2)));
                // let TR = CheapCF.ToObjectSpace(OtherCheapCF.ToWorldSpace(CFrame.fromXYZ(OtherInfo.Size.x / 2, 0, -OtherInfo.Length / 2)));
                // let BL = CheapCF.ToObjectSpace(OtherCheapCF.ToWorldSpace(CFrame.fromXYZ(-OtherInfo.Size.x / 2, 0, OtherInfo.Length / 2)));
                // let BR = CheapCF.ToObjectSpace(OtherCheapCF.ToWorldSpace(CFrame.fromXYZ(-OtherInfo.Size.x / 2, 0, -OtherInfo.Length / 2)));
                let TL = CheapCF.ToObjectSpace(CFrame.fromVector3(OtherCheapCF.ToWorldSpace(CFrame.fromXYZ(RUN, RISE, LENGTH)).Position));
                let TR = CheapCF.ToObjectSpace(CFrame.fromVector3(OtherCheapCF.ToWorldSpace(CFrame.fromXYZ(RUN, RISE, -LENGTH)).Position));
                let BL = CheapCF.ToObjectSpace(CFrame.fromVector3(OtherCheapCF.ToWorldSpace(CFrame.fromXYZ(-RUN, -RISE, LENGTH)).Position));
                let BR = CheapCF.ToObjectSpace(CFrame.fromVector3(OtherCheapCF.ToWorldSpace(CFrame.fromXYZ(-RUN, -RISE, -LENGTH)).Position));
                BoundsList.push(TL, TR, BL, BR);
            };
            BoundsByRoof[RoofID] = Vector3.Bounds(BoundsList); // CheapCF.Vector3Bounds(BoundsList); // 
            // BoundsByRoof[RoofID] = CheapCF.Vector3Bounds(BoundsList); // 
            // console.log("BOUNDS", RoofID, Vector3.Bounds(BoundsList)[1].TranslateSub(Vector3.Bounds(BoundsList)[0]), CheapCF.Vector3Bounds(BoundsList)[1].TranslateSub(CheapCF.Vector3Bounds(BoundsList)[0]));
            // console.log("BOUNDS", Bounds);
            // for (let RoofID2 of Group) {
            //     let Info2 = ConvertedRoofs[RoofID2];
            //     let Roof2 = Info2.Raw;

            // }

            // BoundsByRoof[RoofID] = {
            //     SW: Info.SW,
            //     NE: Info.NE,
            //     Center: Info.Center,
            //     Size: Info.Size,
            // };
        }
    }
    // Just get the smallest bounds so that you can grab the main orientation.
    let BoundsByGroup = [];
    for (let GroupID in CombineIntoSketches) {
        let Group = CombineIntoSketches[GroupID];
        // let BoundsList = [];
        // for (let RoofID of Group) {
        //     let Info = ConvertedRoofs[RoofID];
        //     let Roof = Info.Raw;
        // }
        // BoundsByGroup[GroupID] = Vector3.Bounds(BoundsList);
        // Group.sort((a, b) => BoundsByRoof[b][1].TranslateSub(BoundsByRoof[b][0]).Magnitude - BoundsByRoof[a][1].TranslateSub(BoundsByRoof[a][0]).Magnitude);
        Group.sort((a, b) => {
            let Difference = BoundsByRoof[a][1].TranslateSub(BoundsByRoof[a][0]).TranslateSub(BoundsByRoof[b][1].TranslateSub(BoundsByRoof[b][0]));
            return Difference.x + Difference.z;
            // let DifferenceA = BoundsByRoof[a][1].TranslateSub(BoundsByRoof[a][0]);
            // let DifferenceB = BoundsByRoof[b][1].TranslateSub(BoundsByRoof[b][0]);
            // return DifferenceA.x - DifferenceB.x + DifferenceA.z - DifferenceB.z;
            // return (DifferenceA.x + DifferenceA.z) - (DifferenceB.x + DifferenceB.z); // DifferenceB.Magnitude - DifferenceA.Magnitude;
        });
        // let FocusRoofBounds = BoundsByRoof[Group[0]];
        // let FocusRoof: CustomBackendType = ConvertedRoofs[Group[0]];
        // let CheapCF = CFrame.fromVector3(FocusRoof.Center.XZY).ToWorldSpace(CFrame.Angles(0, FocusRoof.Raw.azimuthDegrees * Math.PI / 180, 0)); // .ToWorldSpace(CFrame.fromXYZ(Info.Size.x / 2, 0, 0));
        // let FL = CheapCF.ToWorldSpace(CFrame.fromXYZ(FocusRoofBounds[1].x, FocusRoofBounds[0].y, FocusRoofBounds[1].z));
        // let FR = CheapCF.ToWorldSpace(CFrame.fromXYZ(FocusRoofBounds[1].x, FocusRoofBounds[0].y, FocusRoofBounds[0].z));
        // let BR = CheapCF.ToWorldSpace(CFrame.fromXYZ(FocusRoofBounds[0].x, FocusRoofBounds[0].y, FocusRoofBounds[0].z));
        // let BL = CheapCF.ToWorldSpace(CFrame.fromXYZ(FocusRoofBounds[0].x, FocusRoofBounds[0].y, FocusRoofBounds[1].z));
        // BABYLON.MeshBuilder.CreateLines("e", {
        //     points: [
        //         FL.Position.ToBabylon(),
        //         FR.Position.ToBabylon(),
        //         BR.Position.ToBabylon(),
        //         BL.Position.ToBabylon(),
        //         FL.Position.ToBabylon(),
        //     ]
        // }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, 0, 0);
        console.log("GROUP", GroupID, Group.map((RoofID: any) => {
            let Difference = BoundsByRoof[RoofID][1].TranslateSub(BoundsByRoof[RoofID][0]);
            return [RoofID, Difference.x + Difference.z, Difference.Magnitude, Difference];
        }));
    }

    console.log("BOUNDS BY ROOF", BoundsByRoof, BoundsByRoof.map((value, index) => value[1].TranslateSub(value[0])));

    for (let SketchGroupID in CombineIntoSketches) {
        let SketchGroup = CombineIntoSketches[SketchGroupID];
        let AveragePitch = 0;
        let AverageHeight = 0;
        let AverageBottom = 0;
        let AverageTop = 0;
        let AverageRun = 0;
        let LongestRun = 0;

        let FocusRoofIndex = SketchGroup[0];
        let FocusRoofBounds = BoundsByRoof[FocusRoofIndex];
        let FocusRoofSize = FocusRoofBounds[1].TranslateSub(FocusRoofBounds[0]);
        let FocusRoof: CustomBackendType = ConvertedRoofs[FocusRoofIndex];
        let CheapCF = CFrame.fromVector3(FocusRoof.Center.XZY).ToWorldSpace(CFrame.Angles(0, FocusRoof.Raw.azimuthDegrees * Math.PI / 180, 0)); // .ToWorldSpace(CFrame.fromXYZ(Info.Size.x / 2, 0, 0));
        let BoundsCFrame = CheapCF.ToWorldSpace(CFrame.fromXYZ((FocusRoofBounds[0].x + FocusRoofBounds[1].x) / 2, (FocusRoofBounds[0].y + FocusRoofBounds[1].y) / 2, (FocusRoofBounds[0].z + FocusRoofBounds[1].z) / 2));
        let Comparisons: any[] = [];
        for (let RoofID of SketchGroup) {
            let Info = ConvertedRoofs[RoofID];
            let Roof = Info.Raw;
            AveragePitch += Roof.pitchDegrees;
            AverageHeight += Info.Center.z;
            AverageBottom += Info.Center.z - Math.sin(Roof.pitchDegrees * Math.PI / 180) * Info.Size.x;
            AverageTop += Info.Center.z + Math.sin(Roof.pitchDegrees * Math.PI / 180) * Info.Size.x;
            AverageRun += Info.Size.x;
            LongestRun = Math.max(LongestRun, Info.Size.x);
            Comparisons.push(RoofID);
        }

        let BoundLength = Math.max(FocusRoofSize.x, FocusRoofSize.z);
        let BoundWidth = Math.min(FocusRoofSize.x, FocusRoofSize.z);

        AveragePitch /= SketchGroup.length;
        AverageHeight /= SketchGroup.length;
        AverageBottom /= SketchGroup.length;
        AverageTop /= SketchGroup.length;
        AverageRun /= SketchGroup.length;

        console.log("AVERAGE PITCH FOR GROUP", AveragePitch, Math.tan(AveragePitch * Math.PI / 180) * 12);

        // for (let RoofID of SketchGroup) {
        //     let Info = ConvertedRoofs[RoofID];
        //     let Roof = Info.Raw;
        //     let CheapCF = CFrame.fromXYZ(Info.Center.x, 0, Info.Center.y).ToWorldSpace(CFrame.Angles(0, Roof.azimuthDegrees * Math.PI / 180, 0)).ToWorldSpace(CFrame.fromXYZ(Info.Size.x / 2, 0, 0));
        //     // Editor.ActiveEditor.LabelMarker(CheapCF.Position.XZY, "EEEEEEEEE-" + RoofID);

        //     // BABYLON.MeshBuilder.CreateLines("e", { points: [Info.Center.XY.ToBabylonXZY(), CheapCF.Position.ToBabylon()] }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, 0, 0);

        //     for (let RoofID2 of SketchGroup) {
        //         if (RoofID == RoofID2) continue;
        //         if (Comparisons.find(c => (c.Roof1 == RoofID && c.Roof2 == RoofID2) || (c.Roof1 == RoofID2 && c.Roof2 == RoofID))) continue;
        //         let Info2 = ConvertedRoofs[RoofID2];
        //         let Roof2 = Info2.Raw;
        //         let CheapCF2 = CFrame.fromXYZ(Info2.Center.x, 0, Info2.Center.y).ToWorldSpace(CFrame.Angles(0, Roof2.azimuthDegrees * Math.PI / 180, 0)).ToWorldSpace(CFrame.fromXYZ(Info2.Size.x / 2, 0, 0));
        //         Comparisons.push({
        //             Roof1: RoofID,
        //             Roof2: RoofID2,
        //             Difference: CheapCF.ToObjectSpace(CFrame.fromVector3(CheapCF2.Position)),
        //         });
        //     }
        // }

        // Comparisons.sort((a, b) => a.Difference.X - b.Difference.X);
        Comparisons.sort((a, b) => ConvertedRoofs[a].Length - ConvertedRoofs[b].Length);
        console.log(Comparisons);

        let Length = BoundLength - BoundWidth; // ConvertedRoofs[Comparisons[1]].Length - ConvertedRoofs[Comparisons[0]].Length; // (LongestRun - AverageRun) * 2; // ((Info.NE.x - Info.SW.x) ** 2 + (Info.NE.y - Info.SW.y) ** 2) ** .5;
        let Angle = -(ConvertedRoofs[FocusRoofIndex].Raw.azimuthDegrees + (FocusRoofSize.x > FocusRoofSize.z ? 0 : 90)) * Math.PI / 180;
        // if (true) continue;
        let Sketch = new SketchLine(Editor.ActiveEditor, BoundsCFrame.x, BoundsCFrame.z, 0); // Info.NE.y); // Math.round(p.y));
        Sketch.Start();
        Sketch.DrawFrom = "C";
        Sketch.Angle = Angle;
        Sketch.Length = Length;
        Sketch.AnchorPoint = .5;
        let RUN = BoundWidth / 2; // AverageRun; // Math.max(0, MinimumExtrusion, Info?.Size.x ?? (Length / 2));
        // let CheapCF = CFrame.Angles(0, -Angle, 0).ToWorldSpace(CFrame.fromXYZ(0, 0, RUN / 2));
        // console.log(CheapCF);
        // Sketch.X0 = Info.P0.x + CheapCF.Z;
        // Sketch.Y0 = Info.P0.y + CheapCF.X;
        // Sketch.X1 = Info.P1.x + CheapCF.Z;
        // Sketch.Y1 = Info.P1.y + CheapCF.X;
        Sketch.Z1 = AverageHeight - AverageGlobalHeight;
        Sketch.Commit();
        // Sketch.Lines["0"].ENABLED = false;
        // Sketch.Lines["1"].ENABLED = false;
        // Sketch.Lines["A"].ENABLED = false;
        // Sketch.Lines["B"].ENABLED = false;

        Sketch.Lines["A"].PRIMARY = "D";
        Sketch.Lines["0"].PRIMARY = "D";
        Sketch.Lines["1"].PRIMARY = "D";
        Sketch.Lines["B"].PRIMARY = "D";

        Sketch.Lines["A"].PITCH = Math.tan(AveragePitch * Math.PI / 180) * 12;
        Sketch.Lines["B"].PITCH = Sketch.Lines["A"].PITCH;
        Sketch.Lines["1"].PITCH = Sketch.Lines["A"].PITCH;
        Sketch.Lines["0"].PITCH = Sketch.Lines["A"].PITCH;

        Sketch.Lines["0"].RISE = RUN * Math.tan(AveragePitch * Math.PI / 180);
        Sketch.Lines["1"].RISE = RUN * Math.tan(AveragePitch * Math.PI / 180);
        Sketch.Lines["A"].RISE = RUN * Math.tan(AveragePitch * Math.PI / 180);
        Sketch.Lines["B"].RISE = RUN * Math.tan(AveragePitch * Math.PI / 180);

        Sketch.Lines["0"].RUN = RUN;
        Sketch.Lines["1"].RUN = RUN;
        Sketch.Lines["A"].RUN = RUN;
        Sketch.Lines["B"].RUN = RUN;

        Sketch.UpdateLines();
        Sketch.Commit();
        console.log("E?");
    }

    console.log("ALL RELATIONS");
    for (let SketchRelation of SketchLine.AllRelations) {
        let Sketch1 = SketchRelation.Sketch1;
        let Sketch2 = SketchRelation.Sketch2;
        let Intersections = SketchRelation.ListOnlyType("INTERSECT");
        for (let Relation of Intersections) {
            if (Relation.Type1 != "INTERSECT" || Relation.Type2 != "INTERSECT") continue;
            let Line1 = Sketch1.Lines[Relation.Side1];
            let Line2 = Sketch2.Lines[Relation.Side2];

            let Line1Top = Sketch1.Z1 + (Sketch1.AnchorPoint) * Line1.RISE;
            let Line2Top = Sketch2.Z1 + (Sketch2.AnchorPoint) * Line2.RISE;
            let Line1Bottom = Line1Top - Line1.RISE;
            let Line2Bottom = Line2Top - Line2.RISE;

            let LowestBottom = Math.min(Line1Bottom, Line2Bottom);
            let HighestBottom = Math.max(Line1Bottom, Line2Bottom);

            let Data1 = Line1.CF0.Rotation.TranslateAdd(Relation.Data.point.XZY); Data1.Y = Line1Bottom;
            let Data2 = Line2.CF0.Rotation.TranslateAdd(Relation.Data.point.XZY); Data2.Y = Line2Bottom;

            let L1_Q = Math.atan2(Line1.RISE, Line1.RUN);
            let L2_Q = Math.atan2(Line2.RISE, Line2.RUN);

            let Extrude1 = Line1Bottom < Line2Bottom ? 0 : (HighestBottom - LowestBottom) / L1_Q;
            let Extrude2 = Line1Bottom > Line2Bottom ? 0 : (HighestBottom - LowestBottom) / L2_Q;

            let ActualConvergencePoint = Extrude1 == 0 ? Data2.ToWorldSpace(CFrame.fromXYZ(Extrude2, 0, 0)) : Data1.ToWorldSpace(CFrame.fromXYZ(Extrude1, 0, 0));
            // Have to get via CFrame object spaces.
            if (Extrude1 == 0 ? !ActualConvergencePoint.Position.PointInPolygon([
                Line1.SketchExtrusionLines.LineASettings.points[0], // 0
                Line1.SketchExtrusionLines.LineASettings.points[1], // 1
                Line1.SketchExtrusionLines.LineBSettings.points[1], // 2
                Line1.SketchExtrusionLines.LineBSettings.points[0], // 3
            ]) : !ActualConvergencePoint.Position.PointInPolygon([
                Line2.SketchExtrusionLines.LineASettings.points[0], // 0
                Line2.SketchExtrusionLines.LineASettings.points[1], // 1
                Line2.SketchExtrusionLines.LineBSettings.points[1], // 2
                Line2.SketchExtrusionLines.LineBSettings.points[0], // 3
            ])) {
                ActualConvergencePoint = Extrude1 == 0 ? Data2.ToWorldSpace(CFrame.fromXYZ(-Extrude2, 0, 0)) : Data1.ToWorldSpace(CFrame.fromXYZ(-Extrude1, 0, 0));
            }
            let Direction = Line1.CF0.LookVector.Scale(L2_Q).TranslateAdd(Line2.CF0.LookVector.Scale(L1_Q));

            let OTHER1A = segmentIntersection2D(Line1.SketchExtrusionLines.LineASettings.points[0], Line1.SketchExtrusionLines.LineASettings.points[1], ActualConvergencePoint.Position, ActualConvergencePoint.Position.TranslateAdd(Direction));
            let OTHER1B = segmentIntersection2D(Line1.SketchExtrusionLines.LineBSettings.points[0], Line1.SketchExtrusionLines.LineBSettings.points[1], ActualConvergencePoint.Position, ActualConvergencePoint.Position.TranslateAdd(Direction));
            let OTHER2A = segmentIntersection2D(Line2.SketchExtrusionLines.LineASettings.points[0], Line2.SketchExtrusionLines.LineASettings.points[1], ActualConvergencePoint.Position, ActualConvergencePoint.Position.TranslateAdd(Direction));
            let OTHER2B = segmentIntersection2D(Line2.SketchExtrusionLines.LineBSettings.points[0], Line2.SketchExtrusionLines.LineBSettings.points[1], ActualConvergencePoint.Position, ActualConvergencePoint.Position.TranslateAdd(Direction));

            let AddZonings = [];
            if (OTHER1A && 0 <= OTHER1A.t1 && OTHER1A.t1 <= 1) AddZonings.push(OTHER1A.point.XZY);
            if (OTHER1B && 0 <= OTHER1B.t1 && OTHER1B.t1 <= 1) AddZonings.push(OTHER1B.point.XZY);
            if (OTHER2A && 0 <= OTHER2A.t1 && OTHER2A.t1 <= 1) AddZonings.push(OTHER2A.point.XZY);
            if (OTHER2B && 0 <= OTHER2B.t1 && OTHER2B.t1 <= 1) AddZonings.push(OTHER2B.point.XZY);
            // console.log(AddZonings);
            for (let ZoningPoint of AddZonings) {
                let Local = Line1.CF0.ToObjectSpace(CFrame.fromVector3(ZoningPoint));
                let Height = Line1.SketchExtrusionLines.GetHeightAtZ(Local.Z) + Line1Top;
                Line1.SketchExtrusionLines.Zonings.push([Line1.CF0.ToObjectSpace(CFrame.fromVector3(ActualConvergencePoint.Position)).Position, Line1.CF0.ToObjectSpace(CFrame.fromVector3(ZoningPoint.TranslateAdd(new Vector3(0, Height, 0)))).Position]);
                Line2.SketchExtrusionLines.Zonings.push([Line2.CF0.ToObjectSpace(CFrame.fromVector3(ActualConvergencePoint.Position)).Position, Line2.CF0.ToObjectSpace(CFrame.fromVector3(ZoningPoint.TranslateAdd(new Vector3(0, Height, 0)))).Position]);
                BABYLON.MeshBuilder.CreateLines("e", {
                    points: [
                        ZoningPoint.TranslateAdd(new Vector3(0, Height, 0)).ToBabylon(),
                        ActualConvergencePoint.Position.ToBabylon(),
                    ]
                }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(0, 1, 0);
            }
            console.log(Line1.SketchExtrusionLines.Zonings, Line2.SketchExtrusionLines.Zonings);
        }
    }
    console.log("END RELATIONS");
    for (let SketchRelation of SketchLine.AllRelations) {
        for (let Line of Object.values(SketchRelation.Sketch1.Lines)) Line.SketchExtrusionLines.UpdateForZonings();
        for (let Line of Object.values(SketchRelation.Sketch2.Lines)) Line.SketchExtrusionLines.UpdateForZonings();
    }

    // console.log("AVERAGE PITCH", PITCH / COUNT, Math.tan(PITCH / COUNT * Math.PI / 180) * 12);

    // console.log("EEEEEEEEEEEEEEEEEEE");

    // if (true) return;
    for (let RoofID in ConvertedRoofs) {
        if (CombineIntoSketches.find(Group => Group.includes(RoofID))) continue;
        let Info = ConvertedRoofs[RoofID];
        // Roof.stats.areaMeters2
        // Roof.stats
        let Roof = Info.Raw;
        let Length = ((Info.NE.x - Info.SW.x) ** 2 + (Info.NE.y - Info.SW.y) ** 2) ** .5;
        let Angle = Roof.azimuthDegrees * Math.PI / 180;
        let Sketch = new SketchLine(Editor.ActiveEditor, Info.CT.x - Info.dx * 100, Info.CT.y - Info.dy * 100, 0); // Info.NE.y); // Math.round(p.y));
        Sketch.Start();
        Sketch.Angle = Angle;
        Sketch.Length = Length;
        let RUN = Math.max(0, MinimumExtrusion, Info?.Size.x ?? (Length / 2));
        let CheapCF = CFrame.Angles(0, -Angle, 0).ToWorldSpace(CFrame.fromXYZ(0, 0, RUN / 2));
        // console.log(CheapCF);
        Sketch.X0 = Info.P0.x + CheapCF.Z;
        Sketch.Y0 = Info.P0.y + CheapCF.X;
        Sketch.X1 = Info.P1.x + CheapCF.Z;
        Sketch.Y1 = Info.P1.y + CheapCF.X;
        Sketch.Z1 = Info.CT.z - AverageGlobalHeight;
        Sketch.AnchorPoint = .5;
        Sketch.Commit();
        Sketch.Lines["0"].ENABLED = false;
        Sketch.Lines["1"].ENABLED = false;
        // Sketch.Lines["A"].ENABLED = false;
        Sketch.Lines["B"].ENABLED = false;
        // Sketch.Lines["B"].RISE = 10;
        // Sketch.Lines["B"].RUN = 10;

        Sketch.Lines["A"].PRIMARY = "D";
        Sketch.Lines["0"].PRIMARY = "D";
        Sketch.Lines["1"].PRIMARY = "D";
        Sketch.Lines["B"].PRIMARY = "D";

        Sketch.Lines["A"].PITCH = Math.tan(Roof.pitchDegrees * Math.PI / 180) * 12;
        Sketch.Lines["B"].PITCH = Sketch.Lines["A"].PITCH;
        Sketch.Lines["1"].PITCH = Sketch.Lines["A"].PITCH;
        Sketch.Lines["0"].PITCH = Sketch.Lines["A"].PITCH;

        Sketch.Lines["0"].RISE = RUN * Math.tan(Roof.pitchDegrees * Math.PI / 180);
        Sketch.Lines["1"].RISE = RUN * Math.tan(Roof.pitchDegrees * Math.PI / 180);
        Sketch.Lines["A"].RISE = RUN * Math.tan(Roof.pitchDegrees * Math.PI / 180);
        Sketch.Lines["B"].RISE = RUN * Math.tan(Roof.pitchDegrees * Math.PI / 180);

        Sketch.Lines["0"].RUN = 10;
        Sketch.Lines["1"].RUN = 10;
        Sketch.Lines["A"].RUN = RUN; // 10;
        Sketch.Lines["B"].RUN = 10;

        // Editor.ActiveEditor.LabelMarker(new Vector3(Info.CT.x, Info.CT.y, 0), `PITCH: ${Roof.pitchDegrees.toFixed(2)}°\nAZIMUTH: ${((Roof.azimuthDegrees + 45) % 90 - 45).toFixed(2)}°\nAREA: ${Roof.stats.areaMeters2.toFixed(2)} m²`);

        // Sketch.Lines["0"].RISE = Sketch.Lines["A"].RISE;
        // Sketch.Lines["1"].RISE = Sketch.Lines["0"].RISE;

        // Sketch.Lines["A"].RISE = Sketch.Lines["0"].RISE;
        // Sketch.Lines["0"].RISE = Sketch.Lines["1"].RISE;


        Sketch.UpdateLines();
        Sketch.Commit();
        console.log("E?");
    }

    // console.log(content);

    // let Sketch = new SketchLine(Editor.ActiveEditor, p.x, p.z, Math.round(p.y));
    // Sketch.Start();
    // Sketch.Angle
    // Sketch.Length
    // Sketch.UpdateLines();
}

















import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Average, Inter } from "next/font/google";

export class DebuggingClass {
    GoogleMesh!: BABYLON_ADDONS.HtmlMesh;
    mapDiv: HTMLDivElement;
    mapContainer: HTMLDivElement;
    FlatMapElement: HTMLElement | null;
    GoogleMap!: google.maps.Map;
    MapScale = 2000; //63781.37 / 3; // 111132/10

    constructor() {
        console.log("MAP DEBUGGING CLASS CREATED", Editor.window);
        this.FlatMapElement = Editor.window.document.getElementById("flatmap");
        this.FlatMapElement.style.pointerEvents = "none";

        let mapContainer = this.mapContainer = Editor.window.document.createElement("div");
        // overlayMeshDiv.innerHTML = `<p style="padding: 60px; font-size: 80px;">This is an overlay. It is positioned in front of the canvas. This allows it to have transparency and to be non-rectangular, but it will always show over any other content in the scene</p>`;
        mapContainer.style.backgroundColor = 'rgba(0, 0, 0, 0)';
        mapContainer.style.width = '100%';
        mapContainer.style.height = '100%';
        mapContainer.style.border = 'none';
        mapContainer.style.overflow = 'hidden';
        mapContainer.style.pointerEvents = "none";
        // mapContainer.style.zIndex = -1;
        // mapContainer.style.

        let mapDiv = this.mapDiv = Editor.window.document.createElement("div");
        mapDiv.style.position = "absolute";
        mapDiv.style.inset = "0";
        mapDiv.style.width = "100%";
        mapDiv.style.height = "100%";

        mapContainer.appendChild(mapDiv);

        setOptions({ key: "AIzaSyDUfrliF4ydB8G4JbQudiC4t8L39pG_E74" });

        this.RunWithAsync().then(() => {
            console.log("MAP LOADED");
        }).catch((e) => {
            console.error("MAP LOAD ERROR", e);
        });
    }

    async RunWithAsync() {
        const { Map } = await importLibrary("maps");
        this.GoogleMap = new Map(this.mapDiv, {
            zoom: 25,
            center: { lat: 36.1820, lng: -86.5150 },
            mapTypeId: "hybrid", // "satellite",
            tilt: 0, // 45, // 0,
            mapTypeControl: false,
            fullscreenControl: false,
            rotateControl: false,
            streetViewControl: false,
            zoomControl: false,
        });

        this.GoogleMap.addListener("tilesloaded", () => {
            this.GoogleMap.setZoom(25); // 25
            // GoogleMap.setHeading(Camera.alpha * 180 / Math.PI);
            console.log("YAY");
        });

        var InchesInMeter = 39.3701;

        this.GoogleMap.addListener("zoom_changed", () => {
            SketchLine.DrawingScale = 156543.03392 * Math.cos(this.GetMapCenterLAT() * Math.PI / 180) / Math.pow(2, this.GoogleMap.getZoom() ?? 0) * InchesInMeter;
            // GoogleMesh.scalingDeterminant = .015; // .scale(SketchLine.DrawingScale);
            // mapContainer
            // console.log(GoogleMesh);
            this.GoogleMesh._height = this.MapScale * SketchLine.DrawingScale;
            this.GoogleMesh._width = this.MapScale * SketchLine.DrawingScale;
            // GoogleMesh.setContentSizePx(MapScale * SketchLine.DrawingScale, MapScale * SketchLine.DrawingScale);
        });

        this.GoogleMap.addListener("center_changed", async () => {
            SketchLine.DrawingScale = 156543.03392 * Math.cos(this.GetMapCenterLAT() * Math.PI / 180) / Math.pow(2, this.GoogleMap.getZoom() ?? 0) * InchesInMeter;
            // GoogleMesh.scalingDeterminant = .015; // .scale(SketchLine.DrawingScale);
            this.GoogleMesh._height = this.MapScale * SketchLine.DrawingScale;
            this.GoogleMesh._width = this.MapScale * SketchLine.DrawingScale;
            // GoogleMesh.setContentSizePx(MapScale * SketchLine.DrawingScale, MapScale * SketchLine.DrawingScale);
        });

        SketchLine.DrawingScale = 156543.03392 * Math.cos(this.GetMapCenterLAT() * Math.PI / 180) / Math.pow(2, this.GoogleMap.getZoom() ?? 0) * InchesInMeter;

        console.log("SCALE", SketchLine.DrawingScale);
    }

    CreateGoogleDebugMesh() {
        if (this.GoogleMesh) return;
        // HtmlMeshRenderer
        const htmlMeshRenderer = new BABYLON_ADDONS.HtmlMeshRenderer(Editor.ActiveEditor.Scene);
        // const htmlMeshDiv = new BABYLON_ADDONS.HtmlMesh(Scene, "html-mesh-div");
        htmlMeshRenderer._width = 2000;
        htmlMeshRenderer._height = 2000;

        this.GoogleMesh = new BABYLON_ADDONS.HtmlMesh(Editor.ActiveEditor.Scene, "html-overlay-mesh", { isCanvasOverlay: false, captureOnPointerEnter: false, fitStrategy: BABYLON_ADDONS.FitStrategy.NONE });
        this.GoogleMesh.overlayColor = new BABYLON.Color4(0, 0, 0, 0);
        this.GoogleMesh.visibility = 0;
        // GoogleMesh.material.useLogarithmicDepth = true;
        this.GoogleMesh.material.disableLighting = true;
        this.GoogleMesh.scaling = new BABYLON.Vector3(.5, .5, .5);

        // GoogleMesh.element
        this.GoogleMesh.overlayAlpha = 0;
        // GoogleMesh.setContentSizePx(2000, 2000);
        this.GoogleMesh.position.y = 0; // 10;
        this.GoogleMesh.rotation.x = Math.PI / 2; // face the camera
        this.GoogleMesh.rotation.y = -Math.PI / 2; // face the camera
        // this.GoogleMesh.enablePointerEvents = false;
        // this.GoogleMesh.enablePointerMoveEvents = false;
        // GoogleMesh.isVisible = false;
        // transform: rotate(45deg)

        this.GoogleMesh.setContent(this.mapContainer, this.MapScale, this.MapScale);
    }


    SwitchMap(In3D: boolean) {
        if (In3D) this.mapContainer.appendChild(this.mapDiv);
        else this.FlatMapElement?.appendChild(this.mapDiv);
    }

    SetMapCenter(LAT: number, LON: number) {
        this.GoogleMap.setCenter({ lat: LAT, lng: LON });
    }

    GetMapCenterLAT() {
        return this.GoogleMap.getCenter()?.lat() ?? 0;
    }

    GetMapCenterLON() {
        return this.GoogleMap.getCenter()?.lng() ?? 0;
    }
}



















export type Coordinate = { latitude: number; longitude: number };
export type GDate = { year: number; month: number; day: number };
export type GBoundingBox = { sw: Coordinate; ne: Coordinate };

export type GStats = {
    areaMeters2: number;
    sunshineQuantiles: [number];
    groundAreaMeters2: number;
};

export type GRoofSegment = {
    pitchDegrees: number;
    azimuthDegrees: number;
    stats: GStats;
    center: Coordinate;
    boundingBox: GBoundingBox;
    planeHeightAtCenterMeters: number;
};

export type GRoofSummary = {
    pitchDegrees: number;
    azimuthDegrees: number;
    panelsCount: number;
    yearlyEnergyDcKwh: number;
    segmentIndex: number;
};

export type GSolarConfig = {
    panelsCount: number;
    yearlyEnergyDcKwh: number;
    roofSegmentSummaries: [GRoofSummary]
};

export type GFinancialAnalysis = {
    monthlyBill: { currentCode: string, units: number };
    averageKwhPerMonth: number;
    panelConfigIndex: number;
};

export type GSolarPanel = {
    center: Coordinate;
    orientation: string;
    yearlyEnergyDcKwh: number;
    segmentIndex: number;
};

export type GSolarPotential = {
    maxArrayPanelsCount: number;
    maxArrayAreaMeters2: number;
    maxSunshineHoursPerYear: number;
    carbonOffsetFactorKgPerMwh: number;
    wholeRoofStats: GStats;
    roofSegmentStats: [GRoofSegment];
    solarPanelConfigs: [GSolarConfig];
    financialAnalyses: [GFinancialAnalysis];
    panelCapacityWatts: number;
    panelHeightMeters: number;
    panelWidthMeters: number;
    panelLifetimeYears: number;
    buildingStats: GStats;
    solarPanels: [GSolarPanel];
}

export type GSolarData = {
    name: string;
    center: Coordinate;
    imageryDate: GDate;
    postalCode: string;
    administrativeArea: string;
    statisticalArea: string;
    regionCode: string;
    solarPotential: GSolarPotential;
    boundingBox: GBoundingBox;
    imageryQuality: string;
    imageryProcessedDate: GDate;
};