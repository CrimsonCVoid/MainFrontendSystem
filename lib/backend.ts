import { SketchLine } from "./drawings";
import { Editor } from "./editor";
import { CFrame, Vector3 } from "./positioning";
import * as BABYLON from "@babylonjs/core";

var ENV_KEY = "AIzaSyDUfrliF4ydB8G4JbQudiC4t8L39pG_E74"; // API KEY

var InchesInMeter = 39.3701;
var Scale = 111132 * InchesInMeter;
var R = 6378137; // Earth radius in meters (WGS84 approximate)

function CalculateCorners(Data, v) {
    let InfoStoof = {};
    // console.log("INFO", InfoStoof);

    let NE_LAT = v.boundingBox.ne.latitude * Math.PI / 180, NE_LON = v.boundingBox.ne.longitude * Math.PI / 180;
    let SW_LAT = v.boundingBox.sw.latitude * Math.PI / 180, SW_LON = v.boundingBox.sw.longitude * Math.PI / 180;

    let dNE_LAT = NE_LAT - Data.CenteredLAT0, dNE_LON = NE_LON - Data.CenteredLON0;
    let dSW_LAT = SW_LAT - Data.CenteredLAT0, dSW_LON = SW_LON - Data.CenteredLON0;

    let _NE = [-R * dNE_LAT * InchesInMeter, R * dNE_LON * Data.CosCenteredLAT0 * InchesInMeter];
    let _SW = [-R * dSW_LAT * InchesInMeter, R * dSW_LON * Data.CosCenteredLAT0 * InchesInMeter];

    let AX = v.pitchDegrees * Math.PI / 180;
    let AY = v.azimuthDegrees * Math.PI / 180;

    let dx = InfoStoof.dx = Math.sin(AY);
    let dy = InfoStoof.dy = Math.cos(AY);

    let s = Math.tan(AX);

    let PlaneHeightInches = v.planeHeightAtCenterMeters * InchesInMeter;

    let _NW = [_NE[0], _SW[1]];
    let _SE = [_SW[0], _NE[1]];

    // if (UseExisting) {
    // 	N = (Info.NE.X + Info.NW.X) / 2;
    // 	E = (Info.NE.Y + Info.SE.Y) / 2;
    // 	W = (Info.SW.Y + Info.NW.Y) / 2;
    // 	S = (Info.SW.X + Info.SE.X) / 2;
    // }

    let NE = new Vector3(_NE[0], _NE[1], PlaneHeightInches); // - s * ((E - (E + W) / 2) * dx + (S - (N + S) / 2) * dy));
    let NW = new Vector3(_NW[0], _NW[1], PlaneHeightInches); // - s * ((W - (E + W) / 2) * dx + (S - (N + S) / 2) * dy));
    let SW = new Vector3(_SW[0], _SW[1], PlaneHeightInches); // - s * ((W - (E + W) / 2) * dx + (N - (N + S) / 2) * dy));
    let SE = new Vector3(_SE[0], _SE[1], PlaneHeightInches); // - s * ((E - (E + W) / 2) * dx + (N - (N + S) / 2) * dy));

    let CT = InfoStoof.CT = NE.Average(SW);

    BABYLON.MeshBuilder.CreateLines("e", { points: [NE.XY.ToBabylonXZY(), SW.XY.ToBabylonXZY()] }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(0, 0, 1);
    // LabelMarker(NE.XY, "NE"); LabelMarker(SW.XY, "SW");

    // BABYLON.MeshBuilder.CreateLines("e", { points: [NW.XY.ToBabylonXZY(), SE.XY.ToBabylonXZY()] }, Scene).color = new BABYLON.Color3(1, 1, 0);

    BABYLON.MeshBuilder.CreateLines("e", { points: [CT.TranslateAdd(new Vector3(-dx * 100, -dy * 100)).XY.ToBabylonXZY(), CT.TranslateAdd(new Vector3(dx * 100, dy * 100)).XY.ToBabylonXZY()] }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, 1, 0);

    InfoStoof.NE = NE; InfoStoof.NW = NW; InfoStoof.SW = SW; InfoStoof.SE = SE;
    // Info.N = N; Info.E = E; Info.W = W; Info.S = S;
    // if (UseExisting) {
    // 	Info.InnerOuter[0] = Info[Info.InnerOuterKeys[0]];
    // 	Info.InnerOuter[1] = Info[Info.InnerOuterKeys[1]];
    // 	Info.InnerOuter[2] = Info[Info.InnerOuterKeys[2]];
    // 	Info.InnerOuter[3] = Info[Info.InnerOuterKeys[3]];
    // }
    return InfoStoof;
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

    console.log(Data);

    Data.CenteredLAT0 = Data.center.latitude * Math.PI / 180;
    Data.CenteredLON0 = Data.center.longitude * Math.PI / 180;
    Data.SinCenteredLAT0 = Math.sin(Data.CenteredLAT0); Data.CosCenteredLAT0 = Math.cos(Data.CenteredLAT0);

    for (let Roof of Data.solarPotential.roofSegmentStats) {
        // Roof.stats.areaMeters2
        let Info = CalculateCorners(Data, Roof);
        let Length = ((Info.NE.x - Info.SW.x) ** 2 + (Info.NE.y - Info.SW.y) ** 2) ** .5;
        let Angle = Roof.azimuthDegrees * Math.PI / 180;
        // let Sketch = new SketchLine(Editor.ActiveEditor, Info.CT.x - Info.dx * 100, Info.CT.y - Info.dy * 100, 0); // Info.NE.y); // Math.round(p.y));
        // Sketch.Start();
        // Sketch.Angle = Angle;
        // Sketch.Length = Length;
        // let CheapCF = CFrame.Angles(0, -Angle, 0).ToWorldSpace(CFrame.fromXYZ(0, 0, Length / 4));
        // console.log(CheapCF);
        // Sketch.X0 = Info.CT.x - Info.dx * Length / 2 + CheapCF.Z;
        // Sketch.Y0 = Info.CT.y - Info.dy * Length / 2 + CheapCF.X;
        // Sketch.X1 = Info.CT.x + Info.dx * Length / 2 + CheapCF.Z;
        // Sketch.Y1 = Info.CT.y + Info.dy * Length / 2 + CheapCF.X;
        // Sketch.Commit();
        // Sketch.Lines["0"].ENABLED = false;
        // Sketch.Lines["1"].ENABLED = false;
        // // Sketch.Lines["A"].ENABLED = false;
        // Sketch.Lines["B"].ENABLED = false;
        // // Sketch.Lines["B"].RISE = 10;
        // // Sketch.Lines["B"].RUN = 10;

        // Sketch.Lines["A"].PRIMARY = "D";
        // Sketch.Lines["0"].PRIMARY = "D";
        // Sketch.Lines["1"].PRIMARY = "D";
        // Sketch.Lines["B"].PRIMARY = "D";

        // Sketch.Lines["A"].PITCH = Math.tan(Roof.pitchDegrees * Math.PI / 180) * 12;
        // Sketch.Lines["B"].PITCH = Sketch.Lines["A"].PITCH;
        // Sketch.Lines["1"].PITCH = Sketch.Lines["A"].PITCH;
        // Sketch.Lines["0"].PITCH = Sketch.Lines["A"].PITCH;

        // Sketch.Lines["0"].RISE = Length / 2 * Math.tan(Roof.pitchDegrees * Math.PI / 180);
        // Sketch.Lines["1"].RISE = Length / 2 * Math.tan(Roof.pitchDegrees * Math.PI / 180);
        // Sketch.Lines["A"].RISE = Length / 2 * Math.tan(Roof.pitchDegrees * Math.PI / 180);
        // Sketch.Lines["B"].RISE = Length / 2 * Math.tan(Roof.pitchDegrees * Math.PI / 180);

        // Sketch.Lines["0"].RUN = 10;
        // Sketch.Lines["1"].RUN = 10;
        // Sketch.Lines["A"].RUN = Length / 2; // 10;
        // Sketch.Lines["B"].RUN = 10;

        // Sketch.Lines["0"].RISE = Sketch.Lines["A"].RISE;
        // Sketch.Lines["1"].RISE = Sketch.Lines["0"].RISE;

        // Sketch.Lines["A"].RISE = Sketch.Lines["0"].RISE;
        // Sketch.Lines["0"].RISE = Sketch.Lines["1"].RISE;


        Sketch.UpdateLines();
        console.log("E?");
    }

    // console.log(content);

    // let Sketch = new SketchLine(Editor.ActiveEditor, p.x, p.z, Math.round(p.y));
    // Sketch.Start();
    // Sketch.Angle
    // Sketch.Length
    // Sketch.UpdateLines();
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