import { SketchLine, ExtrudedLine } from "./drawings";
import { Editor } from "./editor";
import { CFrame, segmentIntersection2D, Vector3 } from "./positioning";
import * as BABYLON from "@babylonjs/core";
import * as BABYLON_ADDONS from "@babylonjs/addons";
import { PDF_Exporter } from "./pdf-export";

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
    Size: Vector3;
    NE: Vector3;
    NW: Vector3;
    SW: Vector3;
    SE: Vector3;
}

declare global {
    interface ExtrudedLine {
        GetXsAtHeight(Height: number): number[];
        GetBottomAtX(X: number, Inclusive?: boolean, ApplyOffset?: boolean): number;
        GetHeightAtZ(Z: number): number;
    }
}

ExtrudedLine.prototype.GetXsAtHeight = function (Height: number) {
    let BottomLength = this.BottomLength; // this.TopLength + this.ExtrudeA + this.ExtrudeB;
    let ExtrudeLength = (this.RISE ** 2 + this.RUN ** 2) ** .5;
    let ExtrudeB_X = Height / ExtrudeLength * this.ExtrudeB;
    let ExtrudeA_X = -Height / ExtrudeLength * this.ExtrudeA + BottomLength;
    return [ExtrudeB_X, ExtrudeA_X];
}

ExtrudedLine.prototype.GetBottomAtX = function (X: number, Inclusive = false, ApplyOffset = true) {
    let MainLength = this.TopLength;
    let ExtrudeLength = (this.RISE ** 2 + this.RUN ** 2) ** .5;
    let Height = 0;
    for (let ZoningPoint of this.Zonings) {
        let Actual0X = -ZoningPoint[0].X + this.ExtrudeB + MainLength;
        let Actual1X = -ZoningPoint[1].X + this.ExtrudeB + MainLength;
        // if (Actual0X > X) continue;
        let EL2 = ((ZoningPoint[0].Y ** 2 + ZoningPoint[0].Z ** 2) ** .5)
        let EL1 = ((ZoningPoint[1].Y ** 2 + ZoningPoint[1].Z ** 2) ** .5)
        if (Actual0X > Actual1X && (Inclusive ? X <= Actual0X : X < Actual0X)) { // && Actual1X < X && X < Actual0X) {
            Height = Math.max(Height, (Actual0X - X) / (Actual0X - Actual1X) * (EL2 - EL1) - (ApplyOffset ? 1 : 0) * (EL2 - ExtrudeLength)); // Math.max(Height, ExtrudeLength - ((ZoningPoint[0].Y ** 2 + ZoningPoint[0].Z ** 2) ** .5));
        }
        if (Actual0X < Actual1X && (Inclusive ? Actual0X <= X : Actual0X < X)) { // && Actual0X < X && X < Actual1X) {
            Height = Math.max(Height, (X - Actual0X) / (Actual1X - Actual0X) * (EL2 - EL1) - (ApplyOffset ? 1 : 0) * (EL2 - ExtrudeLength)); // Math.max(Height, ExtrudeLength - ((ZoningPoint[0].Y ** 2 + ZoningPoint[0].Z ** 2) ** .5));
        }
    }
    return Height;
}

ExtrudedLine.prototype.GetHeightAtZ = function (Z: number) {
    return this.RISE * Z / this.RUN; // + Line1Top;
};

function CalculateCorners(Data: GSolarData & { CenteredLAT0: number, CenteredLON0: number, CosCenteredLAT0: number }, v: GRoofSegment, LineCreation = false, HouseAzimuth?: number) {
    let Info: CustomBackendType = { Raw: v, Panels: [], Size: new Vector3() };
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
    if (HouseAzimuth) v.azimuthDegrees = HouseAzimuth + v.azimuthDegrees - (((v.azimuthDegrees - 45) % 90) + 45);
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

function InchesToFT_IN_FORMAT(X: number) {
    let Inches = Math.ceil(X);
    let Feet = Math.floor(Inches / 12);
    return Feet + "'-" + (Inches - Feet * 12) + "\"";
}

export async function Test(Lat: number | string, Lon: number | string) {

    for (let i in SketchLine.AllRelations) {
        delete SketchLine.AllRelations[i];
        // SketchLine.AllRelations[i] = undefined;
    }
    SketchLine.AllRelations = [];
    for (let i in SketchLine.AllDrawings) {
        SketchLine.AllDrawings[i].Delete();
        delete SketchLine.AllDrawings[i];
        // SketchLine.AllDrawings[i] = undefined;
    }
    SketchLine.AllDrawings = [];

    // Lat = 40.26076924275762, Lon = -74.7981296370152;
    let URL = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${Lat}&location.longitude=${Lon}&key=${ENV_KEY}`;
    const response = await fetch(URL);
    const Data = await response.json() as GSolarData & { CenteredLAT0: number, CenteredLON0: number, CosCenteredLAT0: number, SinCenteredLAT0: number };
    if (response.status != 200) {
        // console.error('findClosestBuilding\n', content);
        throw Data;
    }

    setOptions({ key: "AIzaSyDUfrliF4ydB8G4JbQudiC4t8L39pG_E74" });
    const { Map } = await importLibrary("maps");
    const GoogleGeometry = await importLibrary("geometry");
    let Radius = GoogleGeometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(Data.boundingBox.ne.latitude, Data.boundingBox.ne.longitude),
        new google.maps.LatLng(Data.boundingBox.sw.latitude, Data.boundingBox.sw.longitude),
    ) / 2;

    // console.log(Radius);

    console.log("hello?");

    let NewPDF = await PDF_Exporter.Create();
    NewPDF.NextPage();
    NewPDF.NextPage();
    NewPDF.NextPage();
    NewPDF.PageIndex = 0;
    // NewPDF.Scale = 5 / Radius;
    let AllBoundsEverYes = [];

    let RoofOutlineLayers = [0, 1, 2, 3];

    let DrawTheseInOrder = {
        Panels: NewPDF.DrawingsInOrder.EstablishType("Panels", 0, [0, 1], { r: 0, g: 0, b: 0, a: .5 }),
        TestLine: NewPDF.DrawingsInOrder.EstablishType("TestLine", 10, [], { r: 1, g: 0, b: 1, a: .5 }),
        Hips: NewPDF.DrawingsInOrder.EstablishType("Hips", 1, RoofOutlineLayers, { r: 0, g: 1, b: 1, a: 1 }),
        InterceptRidges: NewPDF.DrawingsInOrder.EstablishType("InterceptRidges", 2, RoofOutlineLayers, { r: 1, g: 0, b: 0, a: 1 }),
        Valleys: NewPDF.DrawingsInOrder.EstablishType("Valleys", 3, RoofOutlineLayers, { r: 1, g: .5, b: 0, a: 1 }),
        Ridges: NewPDF.DrawingsInOrder.EstablishType("Ridges", 4, RoofOutlineLayers, { r: 0, g: 0, b: 1, a: 1 }),
        Eaves: NewPDF.DrawingsInOrder.EstablishType("Eaves", 5, RoofOutlineLayers, { r: 0, g: 1, b: 0, a: 1 }),
        Gables: NewPDF.DrawingsInOrder.EstablishType("Gables", 5, RoofOutlineLayers, { r: 1, g: 1, b: 0, a: 1 }),
        HighSides: NewPDF.DrawingsInOrder.EstablishType("HighSides", 5, RoofOutlineLayers, { r: 1, g: 0, b: 0, a: 1 }),
        SolarPanels: NewPDF.DrawingsInOrder.EstablishType("SolarPanels", 6, [3], { r: .5, g: .5, b: 1, a: 1 }),
        PanelTexts: NewPDF.DrawingsInOrder.EstablishType("PanelTexts", 7, [1], { r: 0, g: 0, b: 0, a: .5 }).SetTextSize(12),
        PitchTexts: NewPDF.DrawingsInOrder.EstablishType("PitchTexts", 7, [3], { r: 0, g: 0, b: 0, a: .5 }).SetTextSize(20),
        PlaneIDTexts: NewPDF.DrawingsInOrder.EstablishType("PlaneIDTexts", 7, [3], { r: 0, g: 0, b: 0, a: .5 }).SetTextSize(20, 20),
        MeasurementTexts: NewPDF.DrawingsInOrder.EstablishType("MeasurementTexts", 7, [2], { r: 0, g: 0, b: 0, a: .5 }).SetTextSize(12, 8),
        OTHER: NewPDF.DrawingsInOrder.EstablishType("OTHER", 8, [0], { r: 1, g: 1, b: 0, a: 1 }),
    }

    // Data.solarPotential.buildingStats.areaMeters2
    // Data.solarPotential.wholeRoofStats.areaMeters2
    // Data.statisticalArea

    // Editor.MapDebugging.SetMapCenter(Data.center.latitude, Data.center.longitude);

    Data.CenteredLAT0 = Data.center.latitude * Math.PI / 180;
    Data.CenteredLON0 = Data.center.longitude * Math.PI / 180;
    Data.SinCenteredLAT0 = Math.sin(Data.CenteredLAT0); Data.CosCenteredLAT0 = Math.cos(Data.CenteredLAT0);

    console.log("DATA", Data);

    let ConvertedRoofs: CustomBackendType[] = [];
    let SortIndex = [];

    let PITCH = 0;
    let AverageGlobalHeight = 0;
    let COUNT = Data.solarPotential.roofSegmentStats.length;

    let AzimuthWeight = 0;
    let HouseAzimuth = 0;
    for (let RoofID in Data.solarPotential.roofSegmentStats) {
        let Roof = Data.solarPotential.roofSegmentStats[RoofID];
        AzimuthWeight += Roof.stats.areaMeters2;
        HouseAzimuth += (((Roof.azimuthDegrees - 45) % 90) + 45) * Roof.stats.areaMeters2;
    }
    HouseAzimuth /= AzimuthWeight;
    console.log("HOUSE AZIMUTH", HouseAzimuth);

    for (let RoofID in Data.solarPotential.roofSegmentStats) {
        let Roof = Data.solarPotential.roofSegmentStats[RoofID];
        // const Idk = Data.solarPotential.solarPanelConfigs[0].roofSegmentSummaries[0];
        let Info = CalculateCorners(Data, Roof, false, HouseAzimuth);
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
        // console.log("ROOF", Index, Roof.pitchDegrees, Roof.planeHeightAtCenterMeters * InchesInMeter, Roof.stats.areaMeters2 * InchesInMeter * InchesInMeter / 144);
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
            let ProjWidth = WIDTH * (Panel.orientation != "PORTRAIT" ? Math.cos(Roof.pitchDegrees * Math.PI / 180) : 1);
            let ProjHeight = HEIGHT * (Panel.orientation == "PORTRAIT" ? Math.cos(Roof.pitchDegrees * Math.PI / 180) : 1);

            let PanelCF = CFrame.fromXYZ(-R * dCenter_LAT * InchesInMeter, Roof.planeHeightAtCenterMeters * InchesInMeter, R * dCenter_LON * Data.CosCenteredLAT0 * InchesInMeter).ToWorldSpace(CFrame.Angles(0, ROT, 0));
            let FL = PanelCF.ToWorldSpace(CFrame.fromXYZ(-ProjWidth, 0, -ProjHeight));
            let FR = PanelCF.ToWorldSpace(CFrame.fromXYZ(ProjWidth, 0, -ProjHeight));
            let BL = PanelCF.ToWorldSpace(CFrame.fromXYZ(-ProjWidth, 0, ProjHeight));
            let BR = PanelCF.ToWorldSpace(CFrame.fromXYZ(ProjWidth, 0, ProjHeight));
            // Please.push(RoofCF.ToObjectSpace(PanelCF).Position);
            // AllBoundsEverYes.push(FL, FR, BL, BR);

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
        // console.log("INTERLIST", InterList);

        if (Please.length == 0) {
            Info.Size.x = HEIGHT * 2;
            continue;
        }
        let Bounds = Vector3.Bounds(Please);
        Info.Size = Bounds[1].TranslateSub(Bounds[0]);
        let UnknownFactor = 1; // 2; // Looks like 2 captures everything properly.
        let ProjWidth = WIDTH * (ORIENT != "PORTRAIT" ? Math.cos(Roof.pitchDegrees * Math.PI / 180) : 1);
        let ProjHeight = HEIGHT * (ORIENT == "PORTRAIT" ? Math.cos(Roof.pitchDegrees * Math.PI / 180) : 1);
        Info.Size.x = Math.max(
            Math.abs(Info.Size.x) + (ORIENT == "PORTRAIT" ? ProjHeight : ProjWidth) * 0,
            Math.abs(Bounds[0].x) * UnknownFactor,
            Math.abs(Bounds[1].x) * UnknownFactor
        ); // * 2;
        MinimumExtrusion = MinimumExtrusion == null ? Info.Size.x : Math.min(MinimumExtrusion, Info.Size.x);
        MaximumExtrusion = MaximumExtrusion == null ? Info.Size.x : Math.max(MaximumExtrusion, Info.Size.x);

        let Adjust = CFrame.Angles(0, -ROOF_ROT, 0).ToWorldSpace(CFrame.fromXYZ(Info.Size.x / 2, 0, 0));
        let Adjust2 = CFrame.Angles(0, -ROOF_ROT, 0).ToWorldSpace(CFrame.fromXYZ(-Info.Size.x / 2, 0, 0));

        AllBoundsEverYes.push(RoofCF.ToWorldSpace(Bounds[0].ToCFrame()), RoofCF.ToWorldSpace(Bounds[1].ToCFrame()));
        AllBoundsEverYes.push(Adjust.TranslateAdd(Info.P0.XZY), Adjust.TranslateAdd(Info.P1.XZY));
        AllBoundsEverYes.push(Adjust2.TranslateAdd(Info.P0.XZY), Adjust2.TranslateAdd(Info.P1.XZY));

        // RawIntersections[RoofID] // USE TO FIGURE OUT POTENTIAL BOUNDS, IGNORE FURTHER, USE INNER.

        // Roof.Size.x += (ORIENT == "PORTRAIT" ? HEIGHT : WIDTH); // * 2;
        // console.log("PUH-LEASEEE", RoofID, Please, Info.Size.x / 2 / (ORIENT == "PORTRAIT" ? HEIGHT : WIDTH), Info.Size.z / 2 / (ORIENT == "PORTRAIT" ? WIDTH : HEIGHT));
        // console.log("PUH-LEASEEE", RoofID, Please, Info.Size.x / (ORIENT == "PORTRAIT" ? HEIGHT : WIDTH), Info.Size.z / (ORIENT == "PORTRAIT" ? WIDTH : HEIGHT));
    };

    let AllBounds = Vector3.Bounds(AllBoundsEverYes);
    let AllBoundsMin = AllBounds[0], AllBoundsMax = AllBounds[1];
    NewPDF.Scale = 300 / (Math.max(Math.abs(AllBoundsMin.x), Math.abs(AllBoundsMin.z), Math.abs(AllBoundsMax.x), Math.abs(AllBoundsMax.z)) + 10);

    console.log(RawIntersections, ConvertedRoofs, Groups, RoofInGroup); // TESTINGBS);

    let ExtrusionSort = [];
    for (let RoofID in ConvertedRoofs) ExtrusionSort.push(RoofID);
    ExtrusionSort.sort((a, b) => (ConvertedRoofs[b].Size.x - ConvertedRoofs[a].Size.x));
    console.log("EXTRUSIONS: ", ExtrusionSort);

    // for (let Roof of ConvertedRoofs) {
    //     console.log(Roof.Raw.pitchDegrees, Math.tan(Roof.Raw.pitchDegrees * Math.PI / 180) * 12);
    // }

    let Counts: number[] = [];
    let ClosestTo: string[][] = [];
    // 1,2,9 | 0,3,4,5,6
    for (let RoofID in ConvertedRoofs) Counts[RoofID] = 0;
    for (let RoofID in ConvertedRoofs) {
        let Info = ConvertedRoofs[RoofID];
        let Roof = Info.Raw;
        let RunHalf = Info.Size.x / 2;
        let TopRoofHeight = Math.sin(Roof.pitchDegrees * Math.PI / 180) * RunHalf;
        let Center = Info.Center.XZY; Center.Y += TopRoofHeight;
        let Adjust = CFrame.Angles(0, Roof.azimuthDegrees * Math.PI / 180, 0).ToWorldSpace(CFrame.fromXYZ(RunHalf, 0, 0));
        let Adjusted = Adjust.TranslateAdd(Center);
        // Editor.ActiveEditor.LabelMarker(Adjusted.Position.ToBabylonXZY(), `${RoofID}`);
        // Editor.ActiveEditor.LabelMarker(Vector3.AverageAll(Sketch.Lines["B"].LineSettings.points).ToBabylonXZY(), `LINE-B`);
        let CloseToRoof: string[] = ClosestTo[RoofID] = [];
        for (let OtherRoofID in ConvertedRoofs) {
            if (RoofID == OtherRoofID) continue;
            let OtherInfo = ConvertedRoofs[OtherRoofID];
            let OtherRoof = OtherInfo.Raw;
            if (OtherRoof.pitchDegrees < 5) continue;
            let OtherRunHalf = OtherInfo.Size.x / 2;
            let OtherTopRoofHeight = Math.sin(OtherRoof.pitchDegrees * Math.PI / 180) * OtherRunHalf;
            let OtherCenter = OtherInfo.Center.XZY; OtherCenter.Y += OtherTopRoofHeight;
            let OtherLocal = Adjusted.ToObjectSpace(OtherCenter.ToCFrame());
            if (OtherLocal.x < -Info.Size.x) continue; // || -12 > OtherLocal.Y || OtherLocal.Y > 12) continue;
            // let TopRoofHeight = 
            let OtherAdjust = CFrame.Angles(0, OtherRoof.azimuthDegrees * Math.PI / 180, 0).ToWorldSpace(CFrame.fromXYZ(OtherRunHalf, 0, 0));
            let OtherAdjusted = OtherAdjust.TranslateAdd(OtherCenter);
            let LocalToOther = OtherAdjusted.ToObjectSpace(Center.ToCFrame());
            if (LocalToOther.x < -OtherInfo.Size.x) continue; // || -12 > LocalToOther.Y || LocalToOther.Y > 12) continue; // Does let you know what builds upwards and stuff.

            if (Math.abs(OtherCenter.Y - Center.Y) > 24) continue;

            // Possibly use the RUN to figure out what to exclude?
            CloseToRoof.push(OtherRoofID);
            Counts[OtherRoofID]++;
        }
        CloseToRoof.sort((A: string, B: string) => {
            let InfoA = ConvertedRoofs[A];
            let RoofA = InfoA.Raw;
            let AdjustA = CFrame.Angles(0, RoofA.azimuthDegrees * Math.PI / 180, 0).ToWorldSpace(CFrame.fromXYZ((InfoA?.Size?.x ?? 0) / 2, 0, 0));
            let AdjustedA = AdjustA.TranslateAdd(InfoA.Center.XZY);

            let InfoB = ConvertedRoofs[B];
            let RoofB = InfoB.Raw;
            let AdjustB = CFrame.Angles(0, RoofB.azimuthDegrees * Math.PI / 180, 0).ToWorldSpace(CFrame.fromXYZ((InfoB?.Size?.x ?? 0) / 2, 0, 0));
            let AdjustedB = AdjustB.TranslateAdd(InfoB.Center.XZY);
            // Use ObjectSpace to get rid of the stuff behind.
            // let LocalA = Adjusted.ToObjectSpace(InfoA.Center.XZY.ToCFrame());
            // let LocalB = Adjusted.ToObjectSpace(InfoB.Center.XZY.ToCFrame());
            return AdjustedA.Distance(Adjusted) - AdjustedB.Distance(Adjusted); // (LocalA.X - LocalB.X) + (LocalA.Z - LocalB.Z); // LocalA.X - LocalB.X; // 
        });
        // console.log(RoofID, CloseToRoof);
        // Info.CT

        // let OFFSET = new Vector3(0, -100, 0);
        // BABYLON.MeshBuilder.CreateLines("e", {
        //     points: [
        //         (Adjust.TranslateAdd(Info.P0.XZY).TranslateAdd(OFFSET).Position.ToBabylon() as BABYLON.Vector3).subtract(new BABYLON.Vector3(0, 200, 0)),
        //         (Info.Center.XZY.TranslateAdd(OFFSET).ToBabylon() as BABYLON.Vector3).subtract(new BABYLON.Vector3(0, 200, 0)),
        //         (Adjust.TranslateAdd(Info.P1.XZY).TranslateAdd(OFFSET).Position.ToBabylon() as BABYLON.Vector3).subtract(new BABYLON.Vector3(0, 200, 0)),
        //     ]
        // }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, 0, 1);
        DrawTheseInOrder.TestLine.AddLine("E", "E", Adjust.TranslateAdd(Info.P0.XZY), Info.Center.XZY, Adjust.TranslateAdd(Info.P1.XZY));
    }

    function CheckReferences(ListsOfReferences: string[][], ReferenceID: string, ReferencesChecked: string[] = [], ReferenceCounter?: number[]) {
        if (ReferencesChecked.includes(ReferenceID)) return ReferencesChecked;
        ReferencesChecked.push(ReferenceID);
        if (ReferenceCounter) ReferenceCounter[ReferenceID] = (ReferenceCounter[ReferenceID] ?? 0) + 1;
        for (let RefID of ListsOfReferences[ReferenceID]) {
            if (ReferencesChecked.includes(RefID)) continue;
            ReferencesChecked.push(RefID);
            if (ReferenceCounter) ReferenceCounter[RefID] = (ReferenceCounter[RefID] ?? 0) + 1;
            CheckReferences(ListsOfReferences, RefID, ReferencesChecked, ReferenceCounter);
        }
        return ReferencesChecked;
    }

    type GroupCounterTing = {
        Set: string[];
        Counter: number;
    }

    let PotentialGroups: GroupCounterTing[] = [];

    let RoofReferences: string[][] = [];
    let RoofID_Counter: number[] = [];
    for (let RoofID in ClosestTo) {
        let AllReferences: string[] = CheckReferences(ClosestTo, RoofID, [], RoofID_Counter);
        let TrueCount: number[][] = [];
        for (let RefID of AllReferences) {
            TrueCount[RefID] = 0;
            for (let RawTings of ClosestTo[RefID]) TrueCount[RefID]++;
        }
        let SameGroupID = -1;
        for (let PotentialGroupID in PotentialGroups) {
            let PotentialGroup = PotentialGroups[PotentialGroupID];
            if (PotentialGroup.Set.length !== AllReferences.length) continue;
            let AllSame = true;
            for (const value of PotentialGroup.Set) {
                if (!AllReferences.includes(value)) AllSame = false;
                if (!AllSame) break;
            }
            if (!AllSame) continue;
            SameGroupID = PotentialGroupID;
        }
        if (SameGroupID != -1) {
            PotentialGroups[SameGroupID].Counter++;
        } else {
            SameGroupID = PotentialGroups.length;
            PotentialGroups[SameGroupID] = { Counter: 1, Set: AllReferences };
        }
        RoofReferences[RoofID] = AllReferences;
        console.log(RoofID, AllReferences);
    }
    console.log("POTENTIALS", PotentialGroups)
    const intersectionMany = lists =>
        lists.reduce((a, b) => a.filter(x => b.includes(x)))
    // function intersectionMany(lists) {
    //     if (!lists.length) return []

    //     return lists.reduce((acc, list) =>
    //         acc.filter(x => list.includes(x))
    //     )
    // }

    for (let RoofID in ClosestTo) {
        let AllReferences = RoofReferences[RoofID];
        let TrueRels: string[] = AllReferences.map(x => x); // filter((v) => RoofReferences[v].includes(RoofID));
        let AllLists = [];
        for (let RefID of AllReferences) AllLists.push(RoofReferences[RefID]);
        console.log(RoofID, intersectionMany(AllLists));
    }
    console.log("uh", RoofID_Counter);

    for (let RoofID in ClosestTo) {
        let CloseToRoof = ClosestTo[RoofID];
        let Info = ConvertedRoofs[RoofID];
        let Roof = Info.Raw;
        // let Connections = RawIntersections[RoofID]; // Could possibly use to determine groups or something?
        let CheapCF = CFrame.fromVector3(Info.Center.XZY).ToWorldSpace(CFrame.Angles(0, Roof.azimuthDegrees * Math.PI / 180, 0)); // .ToWorldSpace(CFrame.fromXYZ(Info.Size.x / 2, 0, 0));
        let BoundsList = [];
        for (let OtherID of CloseToRoof) {
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
        let BOUNDS = Vector3.Bounds(BoundsList);
        // console.log(RoofID, CloseToRoof, Counts[RoofID]); // BOUNDS[1].TranslateSub(BOUNDS[0]));
        // BoundsByRoof[RoofID] = Vector3.Bounds(BoundsList);
    }
    // console.log("COUNT", Counts);


    // if (true) return;

    // Could use significant boundary intersections to handle this automagically.
    let CombineIntoSketches = [];
    let UsedIDs = [];
    PotentialGroups.sort((a, b) => ((b.Counter - a.Counter) == 0 ? -(b.Set.length - a.Set.length) : 0) + b.Counter - a.Counter);
    // for (let GroupID in PotentialGroups) {
    while (PotentialGroups.length > 0 && PotentialGroups[0].Set.length > 1) {
        let NewGroup = [];
        for (let ID of PotentialGroups[0].Set) NewGroup.push(ID);
        if (NewGroup.length <= 1) continue;

        // let SameGroupID = -1;
        // for (let PotentialGroupID = 1; PotentialGroupID < PotentialGroups.length; PotentialGroupID++) {
        //     let PotentialGroup = PotentialGroups[PotentialGroupID];
        //     if (PotentialGroup.Set.length !== AllReferences.length) continue;
        //     let AllSame = true;
        //     for (const value of PotentialGroup.Set) {
        //         if (!AllReferences.includes(value)) AllSame = false;
        //         if (!AllSame) break;
        //     }
        //     if (!AllSame) continue;
        //     SameGroupID = PotentialGroupID;
        // }
        // if (SameGroupID != -1) {
        //     PotentialGroups[SameGroupID].Counter++;
        // } else {
        //     SameGroupID = PotentialGroups.length;
        //     PotentialGroups[SameGroupID] = { Counter: 1, Set: AllReferences };
        // }

        for (let ID of NewGroup) {
            UsedIDs.push(ID);
        }


        for (let PotentialGroupID in PotentialGroups) {
            let PotentialGroup = PotentialGroups[PotentialGroupID];
            PotentialGroup.Set = PotentialGroup.Set.filter(x => !UsedIDs.includes(x))
        }

        PotentialGroups = PotentialGroups.filter(x => x.Set.length > 0);

        console.log(PotentialGroups, NewGroup, UsedIDs);

        // PotentialGroups.sort((a, b) => ((b.Counter - a.Counter) == 0 ? (b.Set.length - a.Set.length) : 0) + b.Counter - a.Counter);

        CombineIntoSketches.push(NewGroup);
        // if (Math.random() > .8) break;
    }
    console.log("AUTOMATIC GROUPING", CombineIntoSketches);
    // CombineIntoSketches = [];
    // let CombineIntoSketches = [["0", "1", "2", "3"]]; // [["0", "3", "4", "5", "6"], ["7", "8"], ["1", "2", "9"]]; // [["0", "2", "1", "3"]]; // [["4", "8", "5", "10"], ["0", "2", "1", "3"], ["7", "6", "9"]]; // ExtrusionSort.copyWithin(0, 0, ExtrusionSort.length);

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
        // console.log("GROUP", GroupID, Group.map((RoofID: any) => {
        //     let Difference = BoundsByRoof[RoofID][1].TranslateSub(BoundsByRoof[RoofID][0]);
        //     return [RoofID, Difference.x + Difference.z, Difference.Magnitude, Difference];
        // }));
    }

    // console.log("BOUNDS BY ROOF", BoundsByRoof, BoundsByRoof.map((value, index) => value[1].TranslateSub(value[0])));


    let JSON_Output = [];

    let DrawSketches: SketchLine[] = [];

    for (let RoofID in ConvertedRoofs) {
        let Info = ConvertedRoofs[RoofID];
        let Roof = Info.Raw;
        let Length = ((Info.NE.x - Info.SW.x) ** 2 + (Info.NE.y - Info.SW.y) ** 2) ** .5;
        // Editor.ActiveEditor.LabelMarker(new Vector3(Info.CT.x, Info.CT.y, 0), `${RoofID}\nLENGTH: ${Math.round(Length * 100) / 100}\nRUN: ${Math.round((Info?.Size.x ?? 0) * 100) / 100}\nPITCH: ${Roof.pitchDegrees.toFixed(2)}°\nAZIMUTH: ${Roof.azimuthDegrees.toFixed(2)}°`); // \nAREA: ${Roof.stats.areaMeters2.toFixed(2)} m²`);
        // BABYLON.MeshBuilder.CreateLines("e", { points: [Info.P0.ToBabylonXZY(), Info.P1.ToBabylonXZY()] }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, .5, 0);

        let RUN = Math.max(0, MinimumExtrusion, Info.Size.x);
        let Angle = (Roof.azimuthDegrees + 90) * Math.PI / 180;
        let Sketch = new SketchLine(Editor.ActiveEditor, Info.Center.X, Info.Center.Z - AverageGlobalHeight, Info.Center.Y); // Info.NE.y); // Math.round(p.y));
        Sketch.DrawLine.LengthAnchor = 0;
        Sketch.DrawLine.RunAnchor = 0;
        Sketch.Start();

        Sketch.DrawLine.Angle = Angle;
        Sketch.DrawLine.Length = Length;
        Sketch.DrawLine.PRIMARY = "D";
        Sketch.DrawLine.PITCH = Math.tan(Roof.pitchDegrees * Math.PI / 180) * 12;
        Sketch.DrawLine.RISE = RUN * Math.tan(Roof.pitchDegrees * Math.PI / 180);
        Sketch.DrawLine.RUN = RUN;

        Sketch.Commit();
        Sketch.Commit();
        Sketch.DrawLine.UpdateData();
        Sketch.DrawLine.Update();

        DrawSketches.push(Sketch);
    }

    // for (let SketchGroupID in CombineIntoSketches) {
    //     let SketchGroup = CombineIntoSketches[SketchGroupID];
    //     let AveragePitch = 0;
    //     let AverageHeight = 0;
    //     let AverageBottom = 0;
    //     let AverageTop = 0;
    //     let AverageRun = 0;
    //     let LongestRun = 0;

    //     let FocusRoofIndex = SketchGroup[0];
    //     let FocusRoofBounds = BoundsByRoof[FocusRoofIndex];
    //     let FocusRoofSize = FocusRoofBounds[1].TranslateSub(FocusRoofBounds[0]);
    //     let FocusRoof: CustomBackendType = ConvertedRoofs[FocusRoofIndex];
    //     let CheapCF = CFrame.fromVector3(FocusRoof.Center.XZY).ToWorldSpace(CFrame.Angles(0, FocusRoof.Raw.azimuthDegrees * Math.PI / 180, 0)); // .ToWorldSpace(CFrame.fromXYZ(Info.Size.x / 2, 0, 0));
    //     let BoundsCFrame = CheapCF.ToWorldSpace(CFrame.fromXYZ((FocusRoofBounds[0].x + FocusRoofBounds[1].x) / 2, (FocusRoofBounds[0].y + FocusRoofBounds[1].y) / 2, (FocusRoofBounds[0].z + FocusRoofBounds[1].z) / 2));
    //     let Comparisons: any[] = [];
    //     for (let RoofID of SketchGroup) {
    //         let Info = ConvertedRoofs[RoofID];
    //         let Roof = Info.Raw;
    //         AveragePitch += Roof.pitchDegrees;
    //         AverageHeight += Info.Center.z;
    //         AverageBottom += Info.Center.z - Math.sin(Roof.pitchDegrees * Math.PI / 180) * Info.Size.x;
    //         AverageTop += Info.Center.z + Math.sin(Roof.pitchDegrees * Math.PI / 180) * Info.Size.x;
    //         AverageRun += Info.Size.x;
    //         LongestRun = Math.max(LongestRun, Info.Size.x);
    //         Comparisons.push(RoofID);
    //         console.log(RoofID, Info.Size.x, Roof.pitchDegrees);
    //     }

    //     // BABYLON.MeshBuilder.CreateLines("e", { points: [CheapCF.ToWorldSpace(FocusRoofBounds[0].ToCFrame()).Position.ToBabylonXZY(), CheapCF.ToWorldSpace(FocusRoofBounds[1].ToCFrame()).Position.ToBabylonXZY()] }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, 0, 0);
    //     BABYLON.MeshBuilder.CreateLines("e", { points: [BoundsCFrame.Position.ToBabylonXZY(), CheapCF.Position.ToBabylonXZY()] }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, 0, 0);

    //     let BoundLength = Math.max(FocusRoofSize.x, FocusRoofSize.z);
    //     let BoundWidth = Math.min(FocusRoofSize.x, FocusRoofSize.z);

    //     AveragePitch /= SketchGroup.length;
    //     AverageHeight /= SketchGroup.length;
    //     AverageBottom /= SketchGroup.length;
    //     AverageTop /= SketchGroup.length;
    //     AverageRun /= SketchGroup.length;

    //     console.log("AVERAGE PITCH FOR GROUP", AveragePitch, Math.tan(AveragePitch * Math.PI / 180) * 12);

    //     // for (let RoofID of SketchGroup) {
    //     //     let Info = ConvertedRoofs[RoofID];
    //     //     let Roof = Info.Raw;
    //     //     let CheapCF = CFrame.fromXYZ(Info.Center.x, 0, Info.Center.y).ToWorldSpace(CFrame.Angles(0, Roof.azimuthDegrees * Math.PI / 180, 0)).ToWorldSpace(CFrame.fromXYZ(Info.Size.x / 2, 0, 0));
    //     //     // Editor.ActiveEditor.LabelMarker(CheapCF.Position.XZY, "EEEEEEEEE-" + RoofID);

    //     //     // BABYLON.MeshBuilder.CreateLines("e", { points: [Info.Center.XY.ToBabylonXZY(), CheapCF.Position.ToBabylon()] }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, 0, 0);

    //     //     for (let RoofID2 of SketchGroup) {
    //     //         if (RoofID == RoofID2) continue;
    //     //         if (Comparisons.find(c => (c.Roof1 == RoofID && c.Roof2 == RoofID2) || (c.Roof1 == RoofID2 && c.Roof2 == RoofID))) continue;
    //     //         let Info2 = ConvertedRoofs[RoofID2];
    //     //         let Roof2 = Info2.Raw;
    //     //         let CheapCF2 = CFrame.fromXYZ(Info2.Center.x, 0, Info2.Center.y).ToWorldSpace(CFrame.Angles(0, Roof2.azimuthDegrees * Math.PI / 180, 0)).ToWorldSpace(CFrame.fromXYZ(Info2.Size.x / 2, 0, 0));
    //     //         Comparisons.push({
    //     //             Roof1: RoofID,
    //     //             Roof2: RoofID2,
    //     //             Difference: CheapCF.ToObjectSpace(CFrame.fromVector3(CheapCF2.Position)),
    //     //         });
    //     //     }
    //     // }

    //     // Comparisons.sort((a, b) => a.Difference.X - b.Difference.X);
    //     Comparisons.sort((a, b) => ConvertedRoofs[a].Length - ConvertedRoofs[b].Length);
    //     console.log(Comparisons);

    //     let Length = (BoundLength - BoundWidth); // (BoundLength - (ConvertedRoofs["2"].Size.x + ConvertedRoofs["3"].Size.x)) / 2; // (BoundLength - BoundWidth) * 10; // ConvertedRoofs[Comparisons[1]].Length - ConvertedRoofs[Comparisons[0]].Length; // (LongestRun - AverageRun) * 2; // ((Info.NE.x - Info.SW.x) ** 2 + (Info.NE.y - Info.SW.y) ** 2) ** .5;
    //     let Angle = -(ConvertedRoofs[FocusRoofIndex].Raw.azimuthDegrees + (FocusRoofSize.x > FocusRoofSize.z ? 0 : 90)) * Math.PI / 180;

    //     // Maybe use azimuth degrees to figure out which surface is which sketch line. //

    //     // if (true) continue;
    //     let Sketch = new SketchLine(Editor.ActiveEditor, BoundsCFrame.x, BoundsCFrame.z, 0); // Info.NE.y); // Math.round(p.y));
    //     Sketch.Start();
    //     Sketch.DrawFrom = "C";
    //     Sketch.Angle = Angle;
    //     Sketch.Length = Length;
    //     // Sketch.Width = 100;
    //     Sketch.AnchorPoint = .5;
    //     let RUN = BoundWidth / 2; // AverageRun; // Math.max(0, MinimumExtrusion, Info?.Size.x ?? (Length / 2));
    //     // let CheapCF = CFrame.Angles(0, -Angle, 0).ToWorldSpace(CFrame.fromXYZ(0, 0, RUN / 2));
    //     // console.log(CheapCF);
    //     // Sketch.X0 = Info.P0.x + CheapCF.Z;
    //     // Sketch.Y0 = Info.P0.y + CheapCF.X;
    //     // Sketch.X1 = Info.P1.x + CheapCF.Z;
    //     // Sketch.Y1 = Info.P1.y + CheapCF.X;
    //     Sketch.Z1 = AverageHeight - AverageGlobalHeight;
    //     Sketch.Commit();
    //     // Sketch.Lines["0"].ENABLED = false;
    //     // Sketch.Lines["1"].ENABLED = false;
    //     // Sketch.Lines["A"].ENABLED = false;
    //     // Sketch.Lines["B"].ENABLED = false;
    //     // Sketch.Lines["0"].Length = Sketch.Lines["1"].Length = 100;

    //     Sketch.Lines["A"].PRIMARY = "D";
    //     Sketch.Lines["0"].PRIMARY = "D";
    //     Sketch.Lines["1"].PRIMARY = "D";
    //     Sketch.Lines["B"].PRIMARY = "D";

    //     // RISE = RUN*PITCH
    //     // RISE/RUN = PITCH
    //     // RISE/PITCH = RUN

    //     let RISE = AverageTop - AverageBottom; //RUN * Math.tan(AveragePitch * Math.PI / 180);

    //     // Sketch.Lines["0"].PITCH = Math.tan(ConvertedRoofs["2"].Raw.pitchDegrees * Math.PI / 180) * 12;
    //     // Sketch.Lines["1"].PITCH = Math.tan(ConvertedRoofs["3"].Raw.pitchDegrees * Math.PI / 180) * 12;
    //     // Sketch.Lines["A"].PITCH = Math.tan(ConvertedRoofs["1"].Raw.pitchDegrees * Math.PI / 180) * 12;
    //     // Sketch.Lines["B"].PITCH = Math.tan(ConvertedRoofs["0"].Raw.pitchDegrees * Math.PI / 180) * 12;

    //     // Sketch.Lines["0"].RUN = RISE / Sketch.Lines["0"].PITCH * 12;
    //     // Sketch.Lines["1"].RUN = RISE / Sketch.Lines["1"].PITCH * 12;
    //     // Sketch.Lines["A"].RUN = RISE / Sketch.Lines["A"].PITCH * 12;
    //     // Sketch.Lines["B"].RUN = RISE / Sketch.Lines["B"].PITCH * 12;

    //     // Sketch.Lines["0"].RISE = RISE;
    //     // Sketch.Lines["1"].RISE = RISE;
    //     // Sketch.Lines["A"].RISE = RISE;
    //     // Sketch.Lines["B"].RISE = RISE;

    //     // Sketch.Lines["0"].PITCH = Math.tan(ConvertedRoofs["2"].Raw.pitchDegrees * Math.PI / 180) * 12;
    //     // Sketch.Lines["1"].PITCH = Math.tan(ConvertedRoofs["3"].Raw.pitchDegrees * Math.PI / 180) * 12;
    //     // Sketch.Lines["A"].PITCH = Math.tan(ConvertedRoofs["1"].Raw.pitchDegrees * Math.PI / 180) * 12;
    //     // Sketch.Lines["B"].PITCH = Math.tan(ConvertedRoofs["0"].Raw.pitchDegrees * Math.PI / 180) * 12;

    //     // Sketch.Lines["0"].RUN = RISE / Sketch.Lines["0"].PITCH * 12;
    //     // Sketch.Lines["1"].RUN = RISE / Sketch.Lines["1"].PITCH * 12;
    //     // Sketch.Lines["A"].RUN = RISE / Sketch.Lines["A"].PITCH * 12;
    //     // Sketch.Lines["B"].RUN = RISE / Sketch.Lines["B"].PITCH * 12;

    //     // Sketch.Lines["0"].RISE = RISE;
    //     // Sketch.Lines["1"].RISE = RISE;
    //     // Sketch.Lines["A"].RISE = RISE;
    //     // Sketch.Lines["B"].RISE = RISE;

    //     // Sketch.Lines["0"].RUN = ConvertedRoofs["2"].Size.x;
    //     // Sketch.Lines["1"].RUN = ConvertedRoofs["3"].Size.x;
    //     // Sketch.Lines["A"].RUN = ConvertedRoofs["1"].Size.x;
    //     // Sketch.Lines["B"].RUN = ConvertedRoofs["0"].Size.x;

    //     // Sketch.Lines["0"].RISE = Sketch.Lines["0"].RUN * Math.tan(AveragePitch * Math.PI / 180);
    //     // Sketch.Lines["1"].RISE = Sketch.Lines["1"].RUN * Math.tan(AveragePitch * Math.PI / 180);
    //     // Sketch.Lines["A"].RISE = Sketch.Lines["A"].RUN * Math.tan(AveragePitch * Math.PI / 180);
    //     // Sketch.Lines["B"].RISE = Sketch.Lines["B"].RUN * Math.tan(AveragePitch * Math.PI / 180);

    //     Sketch.Lines["0"].RISE = RUN * Math.tan(AveragePitch * Math.PI / 180);
    //     Sketch.Lines["1"].RISE = RUN * Math.tan(AveragePitch * Math.PI / 180);
    //     Sketch.Lines["A"].RISE = RUN * Math.tan(AveragePitch * Math.PI / 180);
    //     Sketch.Lines["B"].RISE = RUN * Math.tan(AveragePitch * Math.PI / 180);

    //     Sketch.Lines["0"].RUN = RUN;
    //     Sketch.Lines["1"].RUN = RUN;
    //     Sketch.Lines["A"].RUN = RUN;
    //     Sketch.Lines["B"].RUN = RUN;

    //     Sketch.UpdateLines();
    //     Sketch.Commit();
    //     // Editor.ActiveEditor.LabelMarker(Vector3.AverageAll(Sketch.Lines["0"].LineSettings.points).ToBabylonXZY(), `LINE-0`);
    //     // Editor.ActiveEditor.LabelMarker(Vector3.AverageAll(Sketch.Lines["1"].LineSettings.points).ToBabylonXZY(), `LINE-1`);
    //     // Editor.ActiveEditor.LabelMarker(Vector3.AverageAll(Sketch.Lines["A"].LineSettings.points).ToBabylonXZY(), `LINE-A`);
    //     // Editor.ActiveEditor.LabelMarker(Vector3.AverageAll(Sketch.Lines["B"].LineSettings.points).ToBabylonXZY(), `LINE-B`);
    //     console.log("E?");
    //     DrawSketches.push(Sketch);

    //     JSON_Output.push({
    //         TempSketch: Sketch,
    //         Length: Length,
    //         Angle: Angle,
    //         StartX: BoundsCFrame.x,
    //         StartY: BoundsCFrame.z,
    //         RUN: BoundWidth / 2,
    //         Z1: AverageHeight - AverageGlobalHeight,
    //         Pitch: AveragePitch,
    //     });
    // }

    // // console.log("ALL RELATIONS");
    // for (let SketchRelation of SketchLine.AllRelations) {
    //     let Sketch1 = SketchRelation.Sketch1;
    //     let Sketch2 = SketchRelation.Sketch2;
    //     let Intersections = SketchRelation.ListOnlyType("INTERSECT");
    //     for (let Relation of Intersections) {
    //         if (Relation.Type1 != "INTERSECT" || Relation.Type2 != "INTERSECT") continue;
    //         let Line1 = Sketch1.Lines[Relation.Side1];
    //         let Line2 = Sketch2.Lines[Relation.Side2];

    //         let Line1Top = Sketch1.Z1 + (Sketch1.AnchorPoint) * Line1.RISE;
    //         let Line2Top = Sketch2.Z1 + (Sketch2.AnchorPoint) * Line2.RISE;
    //         let Line1Bottom = Line1Top - Line1.RISE;
    //         let Line2Bottom = Line2Top - Line2.RISE;

    //         let LowestBottom = Math.min(Line1Bottom, Line2Bottom);
    //         let HighestBottom = Math.max(Line1Bottom, Line2Bottom);

    //         let Data1 = Line1.CF_A0.Rotation.TranslateAdd(Relation.Data.point.XZY); Data1.Y = Line1Bottom;
    //         let Data2 = Line2.CF_A0.Rotation.TranslateAdd(Relation.Data.point.XZY); Data2.Y = Line2Bottom;

    //         let L1_Q = Math.atan2(Line1.RISE, Line1.RUN);
    //         let L2_Q = Math.atan2(Line2.RISE, Line2.RUN);

    //         let Extrude1 = Line1Bottom < Line2Bottom ? 0 : (HighestBottom - LowestBottom) / L1_Q;
    //         let Extrude2 = Line1Bottom > Line2Bottom ? 0 : (HighestBottom - LowestBottom) / L2_Q;

    //         let ActualConvergencePoint = Extrude1 == 0 ? Data2.ToWorldSpace(CFrame.fromXYZ(Extrude2, 0, 0)) : Data1.ToWorldSpace(CFrame.fromXYZ(Extrude1, 0, 0));
    //         // Have to get via CFrame object spaces.
    //         if (Extrude1 == 0 ? !ActualConvergencePoint.Position.PointInPolygon([
    //             Line1.LineASettings.points[0], // 0
    //             Line1.LineASettings.points[1], // 1
    //             Line1.LineBSettings.points[1], // 2
    //             Line1.LineBSettings.points[0], // 3
    //         ]) : !ActualConvergencePoint.Position.PointInPolygon([
    //             Line2.LineASettings.points[0], // 0
    //             Line2.LineASettings.points[1], // 1
    //             Line2.LineBSettings.points[1], // 2
    //             Line2.LineBSettings.points[0], // 3
    //         ])) {
    //             ActualConvergencePoint = Extrude1 == 0 ? Data2.ToWorldSpace(CFrame.fromXYZ(-Extrude2, 0, 0)) : Data1.ToWorldSpace(CFrame.fromXYZ(-Extrude1, 0, 0));
    //         }
    //         let Direction = Line1.CF_A0.LookVector.Scale(L2_Q).TranslateAdd(Line2.CF_A0.LookVector.Scale(L1_Q));

    //         let OTHER1A = segmentIntersection2D(Line1.LineASettings.points[0], Line1.LineASettings.points[1], ActualConvergencePoint.Position, ActualConvergencePoint.Position.TranslateAdd(Direction));
    //         let OTHER1B = segmentIntersection2D(Line1.LineBSettings.points[0], Line1.LineBSettings.points[1], ActualConvergencePoint.Position, ActualConvergencePoint.Position.TranslateAdd(Direction));
    //         let OTHER2A = segmentIntersection2D(Line2.LineASettings.points[0], Line2.LineASettings.points[1], ActualConvergencePoint.Position, ActualConvergencePoint.Position.TranslateAdd(Direction));
    //         let OTHER2B = segmentIntersection2D(Line2.LineBSettings.points[0], Line2.LineBSettings.points[1], ActualConvergencePoint.Position, ActualConvergencePoint.Position.TranslateAdd(Direction));

    //         let AddZonings = [];
    //         if (OTHER1A && 0 <= OTHER1A.t1 && OTHER1A.t1 <= 1) AddZonings.push(OTHER1A.point.XZY);
    //         if (OTHER1B && 0 <= OTHER1B.t1 && OTHER1B.t1 <= 1) AddZonings.push(OTHER1B.point.XZY);
    //         if (OTHER2A && 0 <= OTHER2A.t1 && OTHER2A.t1 <= 1) AddZonings.push(OTHER2A.point.XZY);
    //         if (OTHER2B && 0 <= OTHER2B.t1 && OTHER2B.t1 <= 1) AddZonings.push(OTHER2B.point.XZY);
    //         // console.log(AddZonings);
    //         // for (let ZoningPoint of AddZonings) {
    //         //     let Local = Line1.CF_A0.ToObjectSpace(CFrame.fromVector3(ZoningPoint));
    //         //     let Height = Line1.GetHeightAtZ(Local.Z) + Line1Top;
    //         //     Line1.Zonings.push([Line1.CF_A0.ToObjectSpace(CFrame.fromVector3(ActualConvergencePoint.Position)).Position, Line1.CF_A0.ToObjectSpace(CFrame.fromVector3(ZoningPoint.TranslateAdd(new Vector3(0, Height, 0)))).Position]);
    //         //     Line2.Zonings.push([Line2.CF_A0.ToObjectSpace(CFrame.fromVector3(ActualConvergencePoint.Position)).Position, Line2.CF_A0.ToObjectSpace(CFrame.fromVector3(ZoningPoint.TranslateAdd(new Vector3(0, Height, 0)))).Position]);
    //         //     BABYLON.MeshBuilder.CreateLines("e", {
    //         //         points: [
    //         //             ZoningPoint.TranslateAdd(new Vector3(0, Height, 0)).ToBabylon(),
    //         //             ActualConvergencePoint.Position.ToBabylon(),
    //         //         ]
    //         //     }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(0, 1, 0);
    //         // }
    //         console.log(Line1.Zonings, Line2.Zonings);
    //     }
    // }
    // console.log("END RELATIONS");
    // for (let SketchRelation of SketchLine.AllRelations) {
    //     for (let Line of Object.values(SketchRelation.Sketch1.Lines)) Line.UpdateForZonings();
    //     for (let Line of Object.values(SketchRelation.Sketch2.Lines)) Line.UpdateForZonings();
    // }

    // // console.log("AVERAGE PITCH", PITCH / COUNT, Math.tan(PITCH / COUNT * Math.PI / 180) * 12);

    // // console.log("EEEEEEEEEEEEEEEEEEE");

    // // if (true) return;
    // for (let RoofID in ConvertedRoofs) {
    //     let Info = ConvertedRoofs[RoofID];
    //     let Roof = Info.Raw;
    //     let Length = ((Info.NE.x - Info.SW.x) ** 2 + (Info.NE.y - Info.SW.y) ** 2) ** .5;
    //     // Editor.ActiveEditor.LabelMarker(new Vector3(Info.CT.x, Info.CT.y, 0), `${RoofID}\nLENGTH: ${Math.round(Length * 100) / 100}\nRUN: ${Math.round((Info?.Size.x ?? 0) * 100) / 100}\nPITCH: ${Roof.pitchDegrees.toFixed(2)}°\nAZIMUTH: ${Roof.azimuthDegrees.toFixed(2)}°`); // \nAREA: ${Roof.stats.areaMeters2.toFixed(2)} m²`);

    //     BABYLON.MeshBuilder.CreateLines("e", { points: [Info.P0.XY.ToBabylonXZY(), Info.P1.XY.ToBabylonXZY()] }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, .5, 0);
    //     if (CombineIntoSketches.find(Group => Group.includes(RoofID))) continue;
    //     // Roof.stats.areaMeters2
    //     // Roof.stats
    //     let Angle = -(Roof.azimuthDegrees + 90) * Math.PI / 180;
    //     let Sketch = new SketchLine(Editor.ActiveEditor, Info.CT.x, Info.CT.y, 0); // Info.NE.y); // Math.round(p.y));
    //     Sketch.Start();
    //     Sketch.Angle = Angle;
    //     Sketch.Length = Length;

    //     let RUN = Math.max(0, MinimumExtrusion, Info?.Size.x ?? (Length / 2));
    //     let CheapCF = CFrame.Angles(0, Angle, 0).ToWorldSpace(CFrame.fromXYZ(RUN / 2, 0, -Length));
    //     // console.log(CheapCF);
    //     Sketch.X0 = Info.P0.x + CheapCF.Z;
    //     Sketch.Y0 = Info.P0.y + CheapCF.X;
    //     Sketch.X1 = Info.P1.x + CheapCF.Z;
    //     Sketch.Y1 = Info.P1.y + CheapCF.X;
    //     Sketch.Z1 = Info.CT.z - AverageGlobalHeight;
    //     // BABYLON.MeshBuilder.CreateLines("e", { points: [Info.Center.XY.ToBabylonXZY(), CheapCF.Position.ToBabylon()] }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, 0, 0);
    //     // BABYLON.MeshBuilder.CreateLines("e", { points: [new BABYLON.Vector3(Sketch.X0, 0, Sketch.Y0), new BABYLON.Vector3(Sketch.X1, 0, Sketch.Y1)] }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, 0, 0);
    //     Sketch.UpdateXY();
    //     Sketch.AnchorPoint = .5;
    //     Sketch.Commit();
    //     Sketch.Lines["0"].ENABLED = false;
    //     Sketch.Lines["1"].ENABLED = false;
    //     Sketch.Lines["A"].ENABLED = false;
    //     // Sketch.Lines["B"].ENABLED = false;

    //     // console.log("CREATE ROOFFFFF", RoofID);

    //     // Sketch.Lines["0"].Length = Length;
    //     // Sketch.Lines["1"].Length = Length;
    //     Sketch.Lines["A"].Length = Length;
    //     Sketch.Lines["B"].Length = Length;

    //     Sketch.Lines["A"].PRIMARY = "D";
    //     Sketch.Lines["0"].PRIMARY = "D";
    //     Sketch.Lines["1"].PRIMARY = "D";
    //     Sketch.Lines["B"].PRIMARY = "D";

    //     Sketch.Lines["A"].PITCH = Math.tan(Roof.pitchDegrees * Math.PI / 180) * 12;
    //     Sketch.Lines["B"].PITCH = Sketch.Lines["A"].PITCH;
    //     Sketch.Lines["1"].PITCH = Sketch.Lines["A"].PITCH;
    //     Sketch.Lines["0"].PITCH = Sketch.Lines["A"].PITCH;

    //     Sketch.Lines["0"].RISE = RUN * Math.tan(Roof.pitchDegrees * Math.PI / 180);
    //     Sketch.Lines["1"].RISE = RUN * Math.tan(Roof.pitchDegrees * Math.PI / 180);
    //     Sketch.Lines["A"].RISE = RUN * Math.tan(Roof.pitchDegrees * Math.PI / 180);
    //     Sketch.Lines["B"].RISE = RUN * Math.tan(Roof.pitchDegrees * Math.PI / 180);

    //     Sketch.Lines["0"].RUN = RUN;
    //     Sketch.Lines["1"].RUN = RUN;
    //     Sketch.Lines["A"].RUN = RUN; // 10;
    //     Sketch.Lines["B"].RUN = RUN;

    //     // Editor.ActiveEditor.LabelMarker(new Vector3(Info.CT.x, Info.CT.y, 0), `PITCH: ${Roof.pitchDegrees.toFixed(2)}°\nAZIMUTH: ${((Roof.azimuthDegrees + 45) % 90 - 45).toFixed(2)}°\nAREA: ${Roof.stats.areaMeters2.toFixed(2)} m²`);

    //     // Sketch.Lines["0"].RISE = Sketch.Lines["A"].RISE;
    //     // Sketch.Lines["1"].RISE = Sketch.Lines["0"].RISE;

    //     // Sketch.Lines["A"].RISE = Sketch.Lines["0"].RISE;
    //     // Sketch.Lines["0"].RISE = Sketch.Lines["1"].RISE;


    //     Sketch.UpdateLines();
    //     Sketch.Commit();
    //     // Sketch.Commit();
    //     // console.log("E?");
    //     DrawSketches.push(Sketch);

    //     JSON_Output.push({
    //         NonGroup: true,
    //         TempSketch: Sketch,
    //         Length: Length,
    //         Angle: Angle,
    //         StartX: Info.CT.x,
    //         StartY: Info.CT.y,
    //         RUN: RUN,
    //         Z1: Info.CT.z - AverageGlobalHeight,
    //         Pitch: Roof.pitchDegrees,

    //         X0: Info.P0.x + CheapCF.Z,
    //         Y0: Info.P0.y + CheapCF.X,
    //         X1: Info.P1.x + CheapCF.Z,
    //         Y1: Info.P1.y + CheapCF.X,
    //     });
    // }

    // if (true) return;

    // console.log(content);

    // let Sketch = new SketchLine(Editor.ActiveEditor, p.x, p.z, Math.round(p.y));
    // Sketch.Start();
    // Sketch.Angle
    // Sketch.Length
    // Sketch.UpdateLines();
    // if (true) return;
    let PanelWidth = 16; // 24;






























    // NewPDF.AddTextAtV3("+" + Math.round(Line.PITCH), AVG, -90 + Sketch.Angle * 180 / Math.PI + Line.Angle, 16, 0, 1);

    let ShorthandTypes = {
        Eaves: "ED",
        Hips: "HC",
        Ridges: "RC",
        Valleys: "VF",
        Gables: "GR",
        HighSides: "HS",
        // InterceptRidges: "IR",
        // Panels: "XX",
        // PanelTexts: "XX",
        // OTHER: "XX",
        // SolarPanels: "XX",
    }

    // let DrawTheseInOrder: {} = {
    //     Eaves: [],
    //     Hips: [],
    //     Ridges: [],
    //     Valleys: [],
    //     InterceptRidges: [],
    //     Panels: [],
    //     PanelTexts: [],
    //     OTHER: [],
    //     SolarPanels: [],
    // };

    let ActualPanelMeasurements = 0;
    let ActualPanelCount = 0;

    for (let SketchIndex in DrawSketches) {
        let Sketch = DrawSketches[SketchIndex];
        let SketchColor = { r: Math.random(), g: Math.random(), b: Math.random() };

        let LineID = "X";
        let Line = Sketch.DrawLine;
        if (!Line.ENABLED) continue;
        let MainLength = Line.TopLength;
        let BottomLength = Line.BottomLength; // MainLength + Line.ExtrudeA + Line.ExtrudeB;
        let HardPoints = [0, BottomLength];
        if (Line.ExtrudeA != 0) HardPoints.push(Line.ExtrudeA);
        if (MainLength != 0 && Line.ExtrudeA != 0) HardPoints.push(Line.ExtrudeA + MainLength);
        for (let ZoningPoint of Line.Zonings) {
            let Actual0X = Line.ExtrudeB + ZoningPoint[0].X;
            let Actual1X = Line.ExtrudeB + ZoningPoint[1].X;
            if (!HardPoints.find((x) => Approx(x) == Approx(Actual0X))) HardPoints.push(Actual0X);
            if (!HardPoints.find((x) => Approx(x) == Approx(Actual1X))) HardPoints.push(Actual1X);
            let Height = Line.GetHeightAtX(BottomLength - Actual1X);
            let NormalX = Line.GetXsAtHeight(Height);
            let ExtrudeB = NormalX[0], ExtrudeA = NormalX[1];
            if (Actual1X <= ExtrudeB) if (!HardPoints.find((x) => Approx(x) == Approx(ExtrudeB))) HardPoints.push(ExtrudeB);
            if (Actual1X >= ExtrudeA) if (!HardPoints.find((x) => Approx(x) == Approx(ExtrudeA))) HardPoints.push(ExtrudeA);
        }



        // HardPoints.sort((a, b) => a - b);
        HardPoints.sort((a, b) => b - a);
        // NewPDF.DrawLineFromV3(Line.LineSettings.points[0], Line.LineSettings.points[1], { r: 0, g: 1, b: 0 });
        // NewPDF.DrawLineFromV3(Line.LineASettings.points[0], Line.LineASettings.points[1], { r: 0, g: 1, b: 1 });
        // NewPDF.DrawLineFromV3(Line.LineBSettings.points[0], Line.LineBSettings.points[1], { r: 0, g: 1, b: 1 });

        let ALLPOSITIONSAREDOOMEDHERE = [];
        let LineAngle = Sketch.Angle * 180 / Math.PI + Line.Angle;
        let LineHypo = (Line.RISE ** 2 + Line.RUN ** 2) ** .5;


        let LazyPolyLines: {
            X: number,
            Top: number, TopCF: CFrame,
            RawTop: number, RawTopCF: CFrame,
            Bottom: number, BottomCF: CFrame,
            BottomOffset: number, BottomOffsetCF: CFrame,
            BottomInclusive: number, BottomInclusiveCF: CFrame,
            BottomInclusiveOffset: number, BottomInclusiveOffsetCF: CFrame,
            TestCF?: CFrame,
        }[] = [];

        let LineCF = Line.CF_A1;

        // for (let TinyOffset = -.00001; TinyOffset <= .00001; TinyOffset += .00001)
        for (let Index = 0; Index < HardPoints.length; Index++) {
            let HardX = HardPoints[Index]; // + TinyOffset; // - .00001;
            let TopHypo = Line.GetHeightAtX(BottomLength - HardX);
            let RawTopHypo = Line.GetHeightAtX(BottomLength - HardX, true);
            let LengthFromBottom = Line.GetBottomAtX(BottomLength - HardX, false, false);
            let LengthFromBottomOffset = Line.GetBottomAtX(BottomLength - HardX, false, true);
            let LengthFromBottomInclusive = Line.GetBottomAtX(BottomLength - HardX, true, false);
            let LengthFromBottomInclusiveOffset = Line.GetBottomAtX(BottomLength - HardX, true, true);
            for (let ZoningPoint of Line.Zonings) {
                let Actual0X = Line.ExtrudeA + ZoningPoint[0].X;
                let Actual1X = Line.ExtrudeA + ZoningPoint[1].X;
                if (Approx(HardX) == Approx(Actual0X)) {
                    TopHypo = Math.max(TopHypo, LineHypo - (ZoningPoint[0].Y ** 2 + ZoningPoint[0].Z ** 2) ** .5);
                    LengthFromBottomInclusiveOffset = Math.max(LengthFromBottomInclusiveOffset, LineHypo - (ZoningPoint[0].Y ** 2 + ZoningPoint[0].Z ** 2) ** .5);
                }
                if (Approx(HardX) == Approx(Actual1X)) {
                    TopHypo = Math.max(TopHypo, LineHypo - (ZoningPoint[1].Y ** 2 + ZoningPoint[1].Z ** 2) ** .5);
                    LengthFromBottomInclusiveOffset = Math.max(LengthFromBottomInclusiveOffset, LineHypo - (ZoningPoint[1].Y ** 2 + ZoningPoint[1].Z ** 2) ** .5);
                }
            }
            LazyPolyLines.push({
                X: HardX,
                Top: TopHypo, TopCF: LineCF.ToWorldSpace(CFrame.fromXYZ(HardX, 0, Line.RUN * TopHypo / LineHypo)),
                RawTop: RawTopHypo, RawTopCF: LineCF.ToWorldSpace(CFrame.fromXYZ(HardX, 0, Line.RUN * RawTopHypo / LineHypo)),
                Bottom: LengthFromBottom, BottomCF: LineCF.ToWorldSpace(CFrame.fromXYZ(HardX, 0, Line.RUN * LengthFromBottom / LineHypo)),
                BottomOffset: LengthFromBottomOffset, BottomOffsetCF: LineCF.ToWorldSpace(CFrame.fromXYZ(HardX, 0, Line.RUN * LengthFromBottomOffset / LineHypo)),
                BottomInclusive: LengthFromBottomInclusive, BottomInclusiveCF: LineCF.ToWorldSpace(CFrame.fromXYZ(HardX, 0, Line.RUN * LengthFromBottomInclusive / LineHypo)),
                BottomInclusiveOffset: LengthFromBottomInclusiveOffset, BottomInclusiveOffsetCF: LineCF.ToWorldSpace(CFrame.fromXYZ(HardX, 0, Line.RUN * LengthFromBottomInclusiveOffset / LineHypo)),
                TestCF: LineCF.ToWorldSpace(CFrame.fromXYZ(HardX, 0, Line.RUN * 0 / LineHypo)),
            });
            // if (GlobalHardBottomHeight)
            // if (HardBottomHeight) HardBottom.push(HardBottomHeight);
        }

        LazyPolyLines.sort((a, b) => b.X - a.X);
        // if (+SketchIndex == 1)
        // console.log("IT'S SO HARD", LazyPolyLines.map(x => [x.Bottom, x.BottomOffset, x.BottomInclusive, x.BottomInclusiveOffset]), SketchColor);

        for (let X = 0; X < BottomLength;) {
            if (X == BottomLength) break;
            let LineHypo = (Line.RISE ** 2 + Line.RUN ** 2) ** .5;
            let PrevTopHypo = Line.GetHeightAtX(BottomLength - X);
            let PrevBottomHypo = Line.GetBottomAtX(BottomLength - X);
            let PrevTop = Line.RUN * PrevTopHypo / LineHypo;
            let PrevBottom = Line.RUN * PrevBottomHypo / LineHypo;
            let PrevTestTop = LineCF.ToWorldSpace(CFrame.fromXYZ(X, 0, PrevTop));
            let PrevTestBottom = LineCF.ToWorldSpace(CFrame.fromXYZ(X, 0, PrevBottom));
            // if (X < Line.ExtrudeB && Line.ExtrudeB < X + PanelWidth) X = Line.ExtrudeB;
            let PrevX = X;
            let OverallTopHypo = PrevTopHypo;
            let OverallBottomHypo = PrevBottomHypo;
            X += PanelWidth;
            let AvgCF = PrevTestBottom.Position.Average(PrevTestTop.Position);
            for (let ThisLine of LazyPolyLines) {
                if (PrevX <= ThisLine.X && ThisLine.X <= X) {
                    OverallTopHypo = Math.max(OverallTopHypo, ThisLine.Top);
                    OverallBottomHypo = Math.min(OverallBottomHypo, ThisLine.Bottom);
                }
            }
            // if (X > BottomLength) X = BottomLength;
            let TopHypo = Line.GetHeightAtX(BottomLength - X); OverallTopHypo = Math.max(OverallTopHypo, TopHypo);
            let BottomHypo = Line.GetBottomAtX(BottomLength - X); OverallBottomHypo = Math.min(OverallBottomHypo, BottomHypo);
            // if (Bottom <= Top) continue;
            let TestBottom = LineCF.ToWorldSpace(CFrame.fromXYZ(X, 0, Line.RUN * BottomHypo / ((Line.RISE ** 2 + Line.RUN ** 2) ** .5)));
            let TestTop = LineCF.ToWorldSpace(CFrame.fromXYZ(X, 0, Line.RUN * TopHypo / ((Line.RISE ** 2 + Line.RUN ** 2) ** .5)));
            let PanelLength = OverallTopHypo - OverallBottomHypo;
            if (BottomHypo <= TopHypo) {
                ActualPanelMeasurements += PanelLength;
                ActualPanelCount++;
                if (X <= BottomLength)
                    DrawTheseInOrder.Panels.AddLine(SketchIndex, LineID, TestBottom, TestTop);
            }
            AvgCF = AvgCF.Average(TestBottom.Position.Average(TestTop.Position));
            ALLPOSITIONSAREDOOMEDHERE.push(AvgCF);
            // if (PanelLength > 0) NewPDF.AddText(Math.round(OverallTopHypo) + "-" + Math.round(OverallBottomHypo), AvgCF.X, AvgCF.Z, Sketch.Angle * 180 / Math.PI + Line.Angle);
            // if (PanelLength > 0) NewPDF.AddText(PanelLength.toFixed(), AvgCF.X, AvgCF.Z, Sketch.Angle * 180 / Math.PI + Line.Angle);
            if (PanelLength > 0)
                DrawTheseInOrder.PanelTexts.AddDraw(SketchIndex, LineID, InchesToFT_IN_FORMAT(PanelLength), LineAngle, AvgCF); // .TextWidth = Line.RUN * PanelLength / 3 / LineHypo;
        }

        // console.log(Sketch, Line, LazyPolyLines);
        // if (SketchIndex == "1") console.log("CHEESE", LazyPolyLines);
        // for (let Bottom of HardBottom) {
        for (let Index = 0; Index < LazyPolyLines.length; Index++) {
            let ThisLine = LazyPolyLines[Index];
            if (Line.ExtrudeB == 0 && Index == 0) {
                DrawTheseInOrder.Gables.AddLine(SketchIndex, LineID, ThisLine.TopCF, ThisLine.BottomCF);
            }
            if (Line.ExtrudeB == 0 && Index == LazyPolyLines.length - 1) {
                DrawTheseInOrder.Gables.AddLine(SketchIndex, LineID, ThisLine.TopCF, ThisLine.BottomCF);
            }
            if (Index == LazyPolyLines.length - 1) continue;

            let NextLine = LazyPolyLines[Index + 1];

            // if ((ThisLine.Top - ThisLine.Bottom) >= 0 && ThisLine.Bottom == 0) NewPDF.DrawLineFromV3(ThisLine.BottomCF, ThisLine.TopCF, SketchColor, 1);
            // if ((ThisLine.Top - ThisLine.BottomOffset) >= 0) NewPDF.DrawLineFromV3(ThisLine.TestCF, ThisLine.TopCF, SketchColor, 1);
            // NewPDF.DrawLineFromV3(ThisLine.BottomInclusiveOffsetCF, ThisLine.TopCF, SketchColor, 1);
            // NewPDF.DrawLineFromV3(NextLine.BottomInclusiveOffsetCF, NextLine.TopCF, SketchColor, 1);

            let Slack = .1;
            let ValidGeometry = Approx(ThisLine.Top) >= Approx(ThisLine.BottomInclusiveOffset) - Slack && Approx(NextLine.Top) >= Approx(NextLine.BottomInclusiveOffset) - Slack;

            if (Approx(ThisLine.Bottom) == Approx(NextLine.Bottom)) {
                DrawTheseInOrder.Eaves.AddLine(SketchIndex, LineID, ThisLine.BottomCF, NextLine.BottomCF);
            } else if (ValidGeometry) { //if (ThisLine.BottomInclusive != ThisLine. && Math.max(ThisLine.BottomInclusiveOffset, NextLine.BottomInclusiveOffset) != 0) {
                DrawTheseInOrder.Valleys.AddLine(SketchIndex, LineID, ThisLine.BottomInclusiveOffsetCF, NextLine.BottomInclusiveOffsetCF);
            }

            // if (Approx(ThisLine.Top) == Approx(LineHypo) && Approx(ThisLine.Top) != Approx(NextLine.Top)) {
            //     DrawTheseInOrder.Ridges.AddLine(SketchIndex, LineID, ThisLine.TopCF, ThisLine.TopCF);
            // }

            // if (ThisLine)
            if (Approx(ThisLine.Top) == Approx(NextLine.Top)) {
                // if (Line.LineConnectA.LineConnectA == Line.LineConnectB.LineConnectB && Line.LineConnectA.LineConnectA.ENABLED) {
                //     DrawTheseInOrder.Ridges.AddLine(SketchIndex, LineID, ThisLine.TopCF, NextLine.TopCF);
                // } else {
                //     DrawTheseInOrder.HighSides.AddLine(SketchIndex, LineID, ThisLine.TopCF, NextLine.TopCF);
                // }
                DrawTheseInOrder.HighSides.AddLine(SketchIndex, LineID, ThisLine.TopCF, NextLine.TopCF);
                // if (Approx(ThisLine.Top) == Approx(LineHypo))
                //     DrawTheseInOrder.Ridges.AddLine(SketchIndex, LineID, ThisLine.TopCF, NextLine.TopCF);
                // else
                //     DrawTheseInOrder.InterceptRidges.AddLine(SketchIndex, LineID, ThisLine.TopCF, NextLine.TopCF);
            } else if (ValidGeometry) { //if (ThisLine.BottomInclusive != ThisLine. && Math.max(ThisLine.BottomInclusiveOffset, NextLine.BottomInclusiveOffset) != 0) {
                DrawTheseInOrder.Hips.AddLine(SketchIndex, LineID, ThisLine.TopCF, NextLine.TopCF);
            } else {
                // DrawTheseInOrder.OTHER.AddLine(SketchIndex, LineID, ThisLine.TopCF, NextLine.TopCF);
            }
        }

        // DrawTheseLinesInOrder.Ridges.push([Line.LineASettings.points[0], Line.LineBSettings.points[0], SketchIndex, LineID]);

        NewPDF.PageIndex = 1;
        // let RidgeCalc = Line.CF0.Distance(Line.CF1.Position);
        // if (RidgeCalc != 0) {
        //     let CenterRidge = Line.CF0.Position.Average(Line.CF1.Position);
        //     NewPDF.AddTextAtV3("(RC)-" + InchesToFT_IN_FORMAT(RidgeCalc), CenterRidge, LineAngle + 90, 6, 6, 1); // + Math.PI / 4);
        // }

        // let AvgPos = Vector3.AverageAll(ALLPOSITIONSAREDOOMEDHERE);
        // NewPDF.AddTextAtV3("+" + Math.round(Line.PITCH), AvgPos, -90, 16, 0, 1);

        // NewPDF.AddText("(HC)-", Line.LineASettings.points[0], Line.LineBSettings.points[0])
        NewPDF.PageIndex = 0;

        // NewPDF.DrawLine();
    }

    for (let RoofID in ConvertedRoofs) {
        let Info = ConvertedRoofs[RoofID];
        let Roof = Info.Raw;
        let Panels = Info.Panels;
        let ROOF_ROT = Roof.azimuthDegrees * Math.PI / 180;
        for (let PanelID of Panels) {
            let Panel = Data.solarPotential.solarPanels[PanelID];
            let CenterLAT = Panel.center.latitude * Math.PI / 180, CenterLON = Panel.center.longitude * Math.PI / 180;
            let dCenter_LAT = CenterLAT - Data.CenteredLAT0, dCenter_LON = CenterLON - Data.CenteredLON0;

            let ROT = (Panel.orientation == "PORTRAIT" ? Math.PI / 2 : 0) + ROOF_ROT;
            let ProjWidth = WIDTH * (Panel.orientation != "PORTRAIT" ? Math.cos(Roof.pitchDegrees * Math.PI / 180) : 1);
            let ProjHeight = HEIGHT * (Panel.orientation == "PORTRAIT" ? Math.cos(Roof.pitchDegrees * Math.PI / 180) : 1);

            let PanelCF = CFrame.fromXYZ(-R * dCenter_LAT * InchesInMeter, Roof.planeHeightAtCenterMeters * InchesInMeter, R * dCenter_LON * Data.CosCenteredLAT0 * InchesInMeter).ToWorldSpace(CFrame.Angles(0, ROT, 0));
            let FL = PanelCF.ToWorldSpace(CFrame.fromXYZ(-ProjWidth, 0, -ProjHeight));
            let FR = PanelCF.ToWorldSpace(CFrame.fromXYZ(ProjWidth, 0, -ProjHeight));
            let BL = PanelCF.ToWorldSpace(CFrame.fromXYZ(-ProjWidth, 0, ProjHeight));
            let BR = PanelCF.ToWorldSpace(CFrame.fromXYZ(ProjWidth, 0, ProjHeight));
            DrawTheseInOrder.SolarPanels.AddLine(RoofID, PanelID, FL, FR, BR, BL);
        }
    }

    // for (let SketchID in DrawSketches) {
    //     NewPDF.NextPage();
    //     for (let DrawingType of NewPDF.DrawingsInOrder.DrawTypes) {
    //         if (DrawingType.Type == "SolarPanels") continue;
    //         for (let Drawing of DrawingType.Draws)
    //             if (Drawing.SketchID == SketchID)
    //                 Drawing.Draw(NewPDF);
    //     }
    //     for (let LineID in DrawSketches[SketchID].Lines) {
    //         NewPDF.NextPage();
    //         for (let DrawingType of NewPDF.DrawingsInOrder.DrawTypes) {
    //             if (DrawingType.Type == "SolarPanels") continue;
    //             for (let Drawing of DrawingType.Draws)
    //                 if (Drawing.SketchID == SketchID && Drawing.LineID == LineID)
    //                     Drawing.Draw(NewPDF);
    //         }
    //     }
    // }

    // setOptions({ key: "AIzaSyDUfrliF4ydB8G4JbQudiC4t8L39pG_E74" });
    {
        //&exactQualityRequired=true
        let center = Data.center;
        let ne = Data.boundingBox.ne;
        let sw = Data.boundingBox.sw;
        let diameter = GoogleGeometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(ne.latitude, ne.longitude),
            new google.maps.LatLng(sw.latitude, sw.longitude),
        );
        let radius = Math.ceil(diameter / 2);
        let ImgURL = `https://solar.googleapis.com/v1/dataLayers:get?location.latitude=${center.latitude}&location.longitude=${center.longitude}&radiusMeters=${radius}&view=FULL_LAYERS&requiredQuality=HIGH&exactQualityRequired=true&pixelSizeMeters=0.1&key=${ENV_KEY}`;
        let ImgResponse = await fetch(ImgURL);
        let ImgData = await ImgResponse.json() as DataLayersResponse;
        if (ImgResponse.status != 200) {
            // console.error('findClosestBuilding\n', content);
            throw ImgData;
        }
        const mask = await downloadGeoTIFF(ImgData.rgbUrl, ENV_KEY);
        let RGB_Index = await NewPDF.AddImage(mask.PNG);
        NewPDF.PageIndex = 0;
        NewPDF.DrawImage(RGB_Index);
        NewPDF.PageIndex = 3;
        NewPDF.DrawImage(RGB_Index);
        NewPDF.PageIndex = 0;
    }

    let AlphabeticalizedIdenitifers: any = []; // Record<string, string>
    let NumericalIdenitifers = [];
    function numberToLetters0(num: number) {
        let result = "";
        while (num >= 0) {
            const remainder = num % 26;
            result = String.fromCharCode(65 + remainder) + result;
            num = Math.floor(num / 26) - 1;
        }
        return result;
    }
    for (let SketchID in DrawSketches) {
        let LineID = "X";
        let Line = DrawSketches[SketchID].DrawLine;
        // for (let LineID in DrawSketches[SketchID].Lines) {
        if (!Line.ENABLED) continue;
        NumericalIdenitifers.push(`${SketchID}-${LineID}`);
        AlphabeticalizedIdenitifers[`${SketchID}-${LineID}`] = numberToLetters0(NumericalIdenitifers.length - 1);
        AlphabeticalizedIdenitifers[numberToLetters0(NumericalIdenitifers.length - 1)] = `${SketchID}-${LineID}`;
        // }
    }

    for (let SketchID in DrawSketches) {
        let Sketch = DrawSketches[SketchID];
        let LineID = "X";
        let Line = Sketch.DrawLine;
        // for (let LineID in Sketch.Lines) {
        // let Line = Sketch.Lines[LineID];
        if (!Line.ENABLED) continue;
        let POINTS = [];
        for (let DrawingType of NewPDF.DrawingsInOrder.DrawTypes) {
            for (let Drawing of DrawingType.Draws) {
                if (SketchID == Drawing.SketchID && LineID == Drawing.LineID && Drawing.Points.length == 2) {
                    POINTS.push(Drawing.Points[0], Drawing.Points[1]);
                }
            }
        }
        let BOUNDS = Line.CF_A0.Vector3Bounds(POINTS);
        let AVG = Line.CF_A0.ToWorldSpace(CFrame.fromVector3(BOUNDS[0])).Position.Average(Line.CF_A0.ToWorldSpace(CFrame.fromVector3(BOUNDS[1])).Position);
        DrawTheseInOrder.PitchTexts.AddDraw(SketchID, LineID, `${Math.round(Line.PITCH)}/12`, -90 + Line.Angle, AVG);
        DrawTheseInOrder.PlaneIDTexts.AddDraw(SketchID, LineID, `"${AlphabeticalizedIdenitifers[`${SketchID}-${LineID}`]}"`, -90 + Line.Angle, AVG);

        // NewPDF.AddTextAtV3("+" + Math.round(Line.PITCH), AVG, -90 + Line.Angle, 16, 0, 1);
        // }
    }

    let SimplifiedLines: [] = [];

    for (let DrawingType of NewPDF.DrawingsInOrder.DrawTypes) {
        if (DrawingType.Type == "Panels") continue;
        let Simp: [] = SimplifiedLines[DrawingType.Type] = [];
        let Lines: any[][] = [];
        for (let DrawingIndex in DrawingType.Draws) {
            let Drawing = DrawingType.Draws[DrawingIndex];
            if (Drawing.Points.length != 2) continue;
            let Point0 = Drawing.Points[0], Point1 = Drawing.Points[1];
            // let AddDistance = ((Point1.x - Point0.x) ** 2 + ((Point1.y ?? 0) - (Point0.y ?? 0)) ** 2 + (Point1.z - Point0.z) ** 2) ** .5;
            let NewLine = Lines.length == 0;
            let LastLine: any[] = !NewLine ? Lines[Lines.length - 1] : [];
            if (NewLine) Lines.push(LastLine);
            let LastDraw = LastLine.length != 0 ? LastLine[LastLine.length - 1] : null;
            if (!LastDraw) {
                LastLine.push(Drawing);
                continue;
            }
            if (LastDraw.SketchID == Drawing.SketchID && LastDraw.LineID == Drawing.LineID && .1 >= ((LastDraw.Points[1].x - Point0.x) ** 2 + ((LastDraw.Points[1].y ?? 0) - (Point0.y ?? 0)) ** 2 + (LastDraw.Points[1].z - Point0.z) ** 2) ** .5) {
                let Sketch = DrawSketches[Drawing.SketchID] as SketchLine;
                if (Sketch.DrawLine.TopLength == 0) {
                    let Origin = Sketch.DrawLine.CF_A0; // .CF_A;
                    let OriginDistFromLast = ((LastDraw.Points[1].x - Origin.x) ** 2 /*+ ((LastDraw.Points[1].y ?? 0) - Origin.y) ** 2 */ + (LastDraw.Points[1].z - Origin.z) ** 2) ** .5;
                    // let OriginDistFromNext = ((Point0.x - Origin.x) ** 2 + ((Point0.y ?? 0) - Origin.y) ** 2 + (Point0.z - Origin.z) ** 2) ** .5;
                    if (.1 >= OriginDistFromLast) {
                        Lines.push([Drawing]);
                        continue;
                    }
                }
                LastLine.push(Drawing);
                continue;
            }
            Lines.push([Drawing]);
        }
        for (let DrawingList of Lines) {
            let TotalDistance = 0;
            let POINTS = [];
            let LineRotation = 0;
            for (let Drawing of DrawingList) {
                let Point0 = Drawing.Points[0], Point1 = Drawing.Points[1];
                POINTS.push(Point0, Point1);
                // console.log("Y", Point0.y ?? 0, Point1.y ?? 0);
                let AddDistance = ((Point1.x - Point0.x) ** 2 + ((Point1.y ?? 0) - (Point0.y ?? 0)) ** 2 + (Point1.z - Point0.z) ** 2) ** .5;
                TotalDistance += AddDistance;
                LineRotation += Math.atan2(-(Point1.z - Point0.z), -(Point1.x - Point0.x)) * 180 / Math.PI * AddDistance;
            }
            let BOUNDS = Vector3.Bounds(POINTS);
            let AVG = BOUNDS[0].Average(BOUNDS[1]);
            NewPDF.PageIndex = 1;
            LineRotation /= TotalDistance; // DrawingList.length;
            Simp.push({ Lines, AVG, LineRotation, TotalDistance });
        }
    }
    let MeasurementCounts = [];
    let Measurements = [];
    for (let DrawingType in SimplifiedLines) {
        let Ignore = [];
        let Simp = SimplifiedLines[DrawingType];
        Measurements[DrawingType] = 0;
        MeasurementCounts[DrawingType] = 0;
        for (let DataIndex in Simp) {
            let DrawingData = Simp[DataIndex];
            if (Ignore.includes(DataIndex)) continue;
            Ignore.push(DataIndex);
            let Positions = [DrawingData.AVG];
            let AverageDistance = DrawingData.TotalDistance;
            if (DrawingData.Lines.length == 0) continue;
            let RefLine = DrawingData.Lines[0];
            // let FirstPoint = DrawingData.Lines[0].Points[0];
            // let LastPoint = DrawingData.Lines[DrawingData.Lines.length - 1].Points[1];
            let Similar = 1;
            for (let DataIndex2 in Simp) {
                let DrawingData2 = Simp[DataIndex2];
                // if (DrawingData == DrawingData2) continue;
                if (Ignore.includes(DataIndex2)) continue;
                if (DrawingData.AVG.DistanceFromPointXZ(DrawingData2.AVG) > 2) continue;
                // if ( || DrawingData.Lines[0].Points[0]) { // } || DrawingData.TotalDistance - 2 <= DrawingData2.TotalDistance && DrawingData2.TotalDistance <= DrawingData.TotalDistance + 2) {
                // let FirstPoint2 = DrawingData2.Lines[0].Points[0];
                // let LastPoint2 = DrawingData2.Lines[DrawingData2.Lines.length-1].Points[1];
                // let FirstDistFromFirst2 = ((FirstPoint.x - FirstPoint2.x) ** 2 + ((FirstPoint.y ?? 0) - (FirstPoint2.y ?? 0)) ** 2 + (FirstPoint.z - FirstPoint2.z) ** 2) ** .5;
                // let FirstDistFromLast2 = ((FirstPoint.x - LastPoint2.x) ** 2 + ((FirstPoint.y ?? 0) - (LastPoint2.y ?? 0)) ** 2 + (FirstPoint.z - LastPoint2.z) ** 2) ** .5;
                // let LastDistFromFirst2 = ((LastPoint.x - FirstPoint2.x) ** 2 + ((LastPoint.y ?? 0) - (FirstPoint2.y ?? 0)) ** 2 + (LastPoint.z - FirstPoint2.z) ** 2) ** .5;
                // let LastDistFromLast2 = ((LastPoint.x - LastPoint2.x) ** 2 + ((LastPoint.y ?? 0) - (LastPoint2.y ?? 0)) ** 2 + (LastPoint.z - LastPoint2.z) ** 2) ** .5;
                // let FirstDist = Math.min(FirstDistFromFirst2, FirstDistFromLast2);
                // let LastDist = Math.min(LastDistFromFirst2, LastDistFromLast2);
                // if (FirstDist >)
                Similar++;
                AverageDistance += DrawingData2.TotalDistance;
                Positions.push(DrawingData2.AVG);
                Ignore.push(DataIndex2);
            }
            AverageDistance /= Similar;
            let AveragePosition = Vector3.AverageAll(Positions);
            // NewPDF.AddTextAtV3(InchesToFT_IN_FORMAT(AverageDistance), AveragePosition, DrawingData.LineRotation, 6, 4);

            DrawTheseInOrder.MeasurementTexts.AddDraw(RefLine.SketchID, RefLine.LineID, "[" + (ShorthandTypes[DrawingType] ?? DrawingType) + "] " + InchesToFT_IN_FORMAT(AverageDistance), DrawingData.LineRotation, AveragePosition);
            Measurements[DrawingType] += AverageDistance;
            MeasurementCounts[DrawingType]++;
        }
    }

    NewPDF.ExecuteOrder66();
    NewPDF.PageIndex = 0;

    let TodayDate = new Date();

    NewPDF.AddText("1825 Mark Twain St", 300, 700, 0, 25, 50, 1);
    NewPDF.AddText("Palo Alto, CA 94303", 300, 700, 0, 25, 25, 1);
    NewPDF.AddText(`${Math.round(Data.center.latitude * 1e7) / 1e7}, ${Math.round(Data.center.longitude * 1e7) / 1e7}`, 300, 700, 0, 5, 5, 1);
    NewPDF.AddText(`Imagery Taken: ${Data.imageryDate.month}/${Data.imageryDate.day}/${Data.imageryDate.year} | Imagery Processed: ${Data.imageryProcessedDate.month}/${Data.imageryProcessedDate.day}/${Data.imageryProcessedDate.year} | Reprocessed: ${TodayDate.toLocaleDateString()}`, 300, 100, 0, 5, -5, 1);
    NewPDF.AddText("Top-down Sketch w/Panels", 300, 100, 0, 25, -25, 1);
    // NewPDF.AddText("Example Placeholders", 300, 100, 0, 25, -50, 1);
    NewPDF.DrawLine(0, 700, 600, 700, { r: 0, g: 0, b: 0, a: 1 });
    NewPDF.DrawLine(0, 100, 600, 100, { r: 0, g: 0, b: 0, a: 1 });

    NewPDF.PageIndex = 1;
    NewPDF.DrawLine(0, 100, 600, 100, { r: 0, g: 0, b: 0, a: 1 });
    NewPDF.AddText(`PANEL WIDTH: ${PanelWidth}"`, 300, 100, 0, 10, -10, 1);
    NewPDF.AddText(`PANEL LF: ${InchesToFT_IN_FORMAT(ActualPanelMeasurements)}`, 300, 100, 0, 10, -20, 1);
    NewPDF.AddText(`PANELS (x${ActualPanelCount}): ${Math.round(ActualPanelMeasurements * PanelWidth / 144 * 100) / 100} SF`, 300, 100, 0, 10, -30, 1);

    NewPDF.PageIndex = 2;
    NewPDF.DrawLine(0, 100, 600, 100, { r: 0, g: 0, b: 0, a: 1 });
    NewPDF.AddText(`[${ShorthandTypes.Eaves}] EAVES (x${MeasurementCounts["Eaves"]}): ${InchesToFT_IN_FORMAT(Measurements["Eaves"])}`, 300, 100, 0, 10, -10, 1);
    NewPDF.AddText(`[${ShorthandTypes.Hips}] HIPS (x${MeasurementCounts["Hips"]}): ${InchesToFT_IN_FORMAT(Measurements["Hips"])}`, 300, 100, 0, 10, -20, 1);
    NewPDF.AddText(`[${ShorthandTypes.Ridges}] RIDGES (x${MeasurementCounts["Ridges"]}): ${InchesToFT_IN_FORMAT(Measurements["Ridges"])}`, 300, 100, 0, 10, -30, 1);
    NewPDF.AddText(`[${ShorthandTypes.Valleys}] VALLEYS (x${MeasurementCounts["Valleys"]}): ${InchesToFT_IN_FORMAT(Measurements["Valleys"])}`, 300, 100, 0, 10, -40, 1);
    NewPDF.AddText(`[${ShorthandTypes.Gables}] GABLES (x${MeasurementCounts["Gables"]}): ${InchesToFT_IN_FORMAT(Measurements["Gables"])}`, 300, 100, 0, 10, -50, 1);
    NewPDF.AddText(`[${ShorthandTypes.HighSides}] HIGHSIDES (x${MeasurementCounts["HighSides"]}): ${InchesToFT_IN_FORMAT(Measurements["HighSides"])}`, 300, 100, 0, 10, -60, 1);

    NewPDF.PageIndex = 3;
    NewPDF.DrawLine(0, 700, 600, 700, { r: 0, g: 0, b: 0, a: 1 });
    NewPDF.DrawLine(0, 100, 600, 100, { r: 0, g: 0, b: 0, a: 1 });

    console.log("Actual Measurements", Measurements);

    console.log("Actual Panel Length", ActualPanelMeasurements);
    console.log("Actual Panel Area", ActualPanelMeasurements * PanelWidth);
    console.log("Actual Panel SQFT", ActualPanelMeasurements * PanelWidth / 144);


    NewPDF.Download();
    console.log("PDF saved?");

    // // SketchLine.AllDrawings
    // let JSON_Output = {};
    // for (let SketchID in SketchLine.AllDrawings) {
    //     let Sketch = SketchLine.AllDrawings[SketchID];
    //     let JSON_Sketch = JSON_Output[SketchID] = {
    //         Lines: {}
    //     };
    //     // JSON_Sketch.
    //     for (let LineID in Sketch.Lines) {
    //         let Line = Sketch.Lines[LineID];
    //         JSON_Sketch.Lines[LineID] = {
    //             Line.
    //         }
    //     }
    //     Sketch.Delete();
    // }

    for (let JSON_Sketch of JSON_Output) {
        JSON_Sketch.Zonings = {};
        // for (let LineID in JSON_Sketch.TempSketch.Lines) {
        let Line = JSON_Sketch.TempSketch.DrawLine; // Lines[LineID];
        // Line.Zonings
        JSON_Sketch.Zonings = Line.Zonings;
        // }
        // JSON_Sketch.TempSketch.Delete();
        JSON_Sketch.TempSketch = null;
        // delete JSON_Sketch.TempSketch;
    }
    // console.log("JSON_Output", JSON_Output);
    return JSON_Output;
}

function Approx(X: number) { return Math.round(X * 1000) / 1000; }

interface DataLayersResponse {
    imageryDate: Date;
    imageryProcessedDate: Date;
    dsmUrl: string;
    rgbUrl: string;
    maskUrl: string;
    annualFluxUrl: string;
    monthlyFluxUrl: string;
    hourlyShadeUrls: string[];
    imageryQuality: 'HIGH' | 'MEDIUM' | 'BASE';
}

interface Bounds {
    north: number;
    south: number;
    east: number;
    west: number;
}

interface GeoTiff {
    width: number;
    height: number;
    rasters: Array<number>[];
    //   bounds: Bounds;
}

import * as geotiff from 'geotiff';
// import * as geokeysToProj4 from 'geotiff-geokeys-to-proj4';
// import proj4 from 'proj4';


async function downloadGeoTIFF(url: string, apiKey: string): Promise<GeoTiff> {
    // console.log(`Downloading data layer: ${url}`);

    // Include your Google Cloud API key in the Data Layers URL.
    const solarUrl = url.includes('solar.googleapis.com') ? url + `&key=${apiKey}` : url;
    // console.log("URL", solarUrl);
    const response = await fetch(solarUrl);
    if (response.status != 200) {
        const error = await response.json();
        console.error(`downloadGeoTIFF failed: ${url}\n`, error);
        throw error;
    }

    // Get the GeoTIFF rasters, which are the pixel values for each band.
    const arrayBuffer = await response.arrayBuffer();
    const tiff = await geotiff.fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();





    const width = image.getWidth(); // rasters.width; // image.getWidth()
    const height = image.getHeight(); // rasters.height; // image.getHeight()

    // Read as RGB (interleaved)
    // const rgb = await image.readRGB(); // Uint8Array length = width*height*3

    // Convert RGB to RGBA by adding alpha channel
    const rgba = new Uint8ClampedArray(width * height * 4);
    // console.log("LENGTH OF RGB???", width, height, rasters.length, rasters)
    for (let i = 0, j = 0; i < width * height; i++, j += 4) {
        rgba[j] = rasters[0][i];       // R
        rgba[j + 1] = rasters[1][i]; // G
        rgba[j + 2] = rasters[2][i]; // B
        rgba[j + 3] = 255;      // A (opaque)
    }
    // console.log("RGBA", rgba);

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')

    const imageData = new ImageData(rgba, width, height)
    ctx.putImageData(imageData, 0, 0)

    // Convert canvas to PNG bytes
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))

    // const url = URL.createObjectURL(blob);
    // const a = document.createElement("a");
    // a.href = url;
    // a.download = "eeee.png"; //filename ?? `Estimate_${data.projectName.replace(/\s+/g, "_")}.pdf`;
    // document.body.appendChild(a);
    // a.click();
    // document.body.removeChild(a);
    // URL.revokeObjectURL(url);

    const pngBytes = new Uint8Array(await blob.arrayBuffer())




    // const PNG_Bytes = await geotiffToPngBytes(arrayBuffer);

    // Reproject the bounding box into lat/lon coordinates.
    //   const box = image.getBoundingBox();
    //   const geoKeys = image.getGeoKeys();
    //   const projObj = geokeysToProj4.toProj4(geoKeys);
    //   const projection = proj4(projObj.proj4, 'WGS84');
    //   const sw = projection.forward({
    //     x: box[0] * projObj.coordinatesConversionParameters.x,
    //     y: box[1] * projObj.coordinatesConversionParameters.y,
    //   });
    //   const ne = projection.forward({
    //     x: box[2] * projObj.coordinatesConversionParameters.x,
    //     y: box[3] * projObj.coordinatesConversionParameters.y,
    //   });

    return {
        // Width and height of the data layer image in pixels.
        // Used to know the row and column since Javascript
        // stores the values as flat arrays.
        width: width, // rasters.width,
        height: height, // rasters.height,
        // PNG_Bytes: PNG_Bytes,
        // Each raster reprents the pixel values of each band.
        // We convert them from `geotiff.TypedArray`s into plain
        // Javascript arrays to make them easier to process.
        rasters: [...Array(rasters.length).keys()].map((i) =>
            Array.from(rasters[i] as geotiff.TypedArray),
        ),
        PNG: pngBytes,
        // The bounding box as a lat/lon rectangle.
        // bounds: {
        //   north: ne.y,
        //   south: sw.y,
        //   east: ne.x,
        //   west: sw.x,
        // },
    };
}










import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
// import { Average, Inter } from "next/font/google";

// export class DebuggingClass {
//     GoogleMesh!: BABYLON_ADDONS.HtmlMesh;
//     mapDiv: HTMLDivElement;
//     mapContainer: HTMLDivElement;
//     FlatMapElement: HTMLElement | null;
//     GoogleMap!: google.maps.Map;
//     MapScale = 2000; //63781.37 / 3; // 111132/10

//     constructor() {
//         console.log("MAP DEBUGGING CLASS CREATED", Editor.window);
//         this.FlatMapElement = Editor.window.document.getElementById("flatmap");
//         this.FlatMapElement.style.pointerEvents = "none";

//         let mapContainer = this.mapContainer = Editor.window.document.createElement("div");
//         // overlayMeshDiv.innerHTML = `<p style="padding: 60px; font-size: 80px;">This is an overlay. It is positioned in front of the canvas. This allows it to have transparency and to be non-rectangular, but it will always show over any other content in the scene</p>`;
//         mapContainer.style.backgroundColor = 'rgba(0, 0, 0, 0)';
//         mapContainer.style.width = '100%';
//         mapContainer.style.height = '100%';
//         mapContainer.style.border = 'none';
//         mapContainer.style.overflow = 'hidden';
//         mapContainer.style.pointerEvents = "none";
//         // mapContainer.style.zIndex = -1;
//         // mapContainer.style.

//         let mapDiv = this.mapDiv = Editor.window.document.createElement("div");
//         mapDiv.style.position = "absolute";
//         mapDiv.style.inset = "0";
//         mapDiv.style.width = "100%";
//         mapDiv.style.height = "100%";

//         mapContainer.appendChild(mapDiv);

//         setOptions({ key: "AIzaSyDUfrliF4ydB8G4JbQudiC4t8L39pG_E74" });

//         this.RunWithAsync().then(() => {
//             console.log("MAP LOADED");
//         }).catch((e) => {
//             console.error("MAP LOAD ERROR", e);
//         });
//     }

//     async RunWithAsync() {
//         const { Map } = await importLibrary("maps");
//         this.GoogleMap = new Map(this.mapDiv, {
//             zoom: 25,
//             center: { lat: 36.1820, lng: -86.5150 },
//             mapTypeId: "hybrid", // "satellite",
//             tilt: 0, // 45, // 0,
//             mapTypeControl: false,
//             fullscreenControl: false,
//             rotateControl: false,
//             streetViewControl: false,
//             zoomControl: false,
//         });

//         this.GoogleMap.addListener("tilesloaded", () => {
//             this.GoogleMap.setZoom(25); // 25
//             // GoogleMap.setHeading(Camera.alpha * 180 / Math.PI);
//             console.log("YAY");
//         });

//         var InchesInMeter = 39.3701;

//         this.GoogleMap.addListener("zoom_changed", () => {
//             SketchLine.DrawingScale = 156543.03392 * Math.cos(this.GetMapCenterLAT() * Math.PI / 180) / Math.pow(2, this.GoogleMap.getZoom() ?? 0) * InchesInMeter;
//             // GoogleMesh.scalingDeterminant = .015; // .scale(SketchLine.DrawingScale);
//             // mapContainer
//             // console.log(GoogleMesh);
//             this.GoogleMesh._height = this.MapScale * SketchLine.DrawingScale;
//             this.GoogleMesh._width = this.MapScale * SketchLine.DrawingScale;
//             // GoogleMesh.setContentSizePx(MapScale * SketchLine.DrawingScale, MapScale * SketchLine.DrawingScale);
//         });

//         this.GoogleMap.addListener("center_changed", async () => {
//             SketchLine.DrawingScale = 156543.03392 * Math.cos(this.GetMapCenterLAT() * Math.PI / 180) / Math.pow(2, this.GoogleMap.getZoom() ?? 0) * InchesInMeter;
//             // GoogleMesh.scalingDeterminant = .015; // .scale(SketchLine.DrawingScale);
//             this.GoogleMesh._height = this.MapScale * SketchLine.DrawingScale;
//             this.GoogleMesh._width = this.MapScale * SketchLine.DrawingScale;
//             // GoogleMesh.setContentSizePx(MapScale * SketchLine.DrawingScale, MapScale * SketchLine.DrawingScale);
//         });

//         SketchLine.DrawingScale = 156543.03392 * Math.cos(this.GetMapCenterLAT() * Math.PI / 180) / Math.pow(2, this.GoogleMap.getZoom() ?? 0) * InchesInMeter;

//         console.log("SCALE", SketchLine.DrawingScale);
//     }

//     CreateGoogleDebugMesh() {
//         if (this.GoogleMesh) return;
//         // HtmlMeshRenderer
//         const htmlMeshRenderer = new BABYLON_ADDONS.HtmlMeshRenderer(Editor.ActiveEditor.Scene);
//         // const htmlMeshDiv = new BABYLON_ADDONS.HtmlMesh(Scene, "html-mesh-div");
//         htmlMeshRenderer._width = 2000;
//         htmlMeshRenderer._height = 2000;

//         this.GoogleMesh = new BABYLON_ADDONS.HtmlMesh(Editor.ActiveEditor.Scene, "html-overlay-mesh", { isCanvasOverlay: false, captureOnPointerEnter: false, fitStrategy: BABYLON_ADDONS.FitStrategy.NONE });
//         this.GoogleMesh.overlayColor = new BABYLON.Color4(0, 0, 0, 0);
//         this.GoogleMesh.visibility = 0;
//         // GoogleMesh.material.useLogarithmicDepth = true;
//         this.GoogleMesh.material.disableLighting = true;
//         this.GoogleMesh.scaling = new BABYLON.Vector3(.5, .5, .5);

//         // GoogleMesh.element
//         this.GoogleMesh.overlayAlpha = 0;
//         // GoogleMesh.setContentSizePx(2000, 2000);
//         this.GoogleMesh.position.y = 0; // 10;
//         this.GoogleMesh.rotation.x = Math.PI / 2; // face the camera
//         this.GoogleMesh.rotation.y = -Math.PI / 2; // face the camera
//         // this.GoogleMesh.enablePointerEvents = false;
//         // this.GoogleMesh.enablePointerMoveEvents = false;
//         // GoogleMesh.isVisible = false;
//         // transform: rotate(45deg)

//         this.GoogleMesh.setContent(this.mapContainer, this.MapScale, this.MapScale);
//     }


//     SwitchMap(In3D: boolean) {
//         if (In3D) this.mapContainer.appendChild(this.mapDiv);
//         else this.FlatMapElement?.appendChild(this.mapDiv);
//     }

//     SetMapCenter(LAT: number, LON: number) {
//         this.GoogleMap.setCenter({ lat: LAT, lng: LON });
//     }

//     GetMapCenterLAT() {
//         return this.GoogleMap.getCenter()?.lat() ?? 0;
//     }

//     GetMapCenterLON() {
//         return this.GoogleMap.getCenter()?.lng() ?? 0;
//     }
// }



















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