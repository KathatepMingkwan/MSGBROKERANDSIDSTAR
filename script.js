var OLMap = null;
var StaticFeatures = new ol.Collection();
var PlaneIconFeatures = new ol.Collection();
var PlaneTrailFeatures = new ol.Collection();
var Planes = {};
var PlanesOrdered = [];
var SelectedPlane = null;
var FollowSelected = false;

function processReceiverUpdate(data) {
    var now = data.now;
    var acs = data.aircraft;

    if (MessageCountHistory.length > 0 && MessageCountHistory[MessageCountHistory.length-1].messages > data.messages) {
        
    }


}

#โหลดข้อมูล
function fetchData() {

}

function initialize() {

}

function start_load_history() {

}

function load_history_item(i) {

}

function end_load_history() {
    $("#loader").addClass("hidden");

    console.log("Done loading history");

    if (PositionHistoryBuffer.length > 0) {
        var now, last=0;
    }
}

function make_geodesic_circle(center, radius, points) {
    var lat1 = center[1] * Math.PI / 180.0;
    var geom = new ol.geom.LineString();
    for (var i = 0; i <= points; ++i) {
        var bearing = i * 2 *Math.PI / points;

        var lat2 = Math.asin()
    }
}

function initialize_map() {

}

function reaper() {
    var newPlanes = [];
    for (var i = 0; i < PlanesOrdered.length; ++i) {
        var plane = PlanesOrdered[i];
    }
}

function refreshPageTitle() {

}

function refreshSelected() {

}

function refreshTableInfo() {

}

function compareAplha() {

}