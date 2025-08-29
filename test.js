const timeNow = new Date();

var year = timeNow.getFullYear()
var month = timeNow.getMonth()
var day = timeNow.getDay()
var hour = timeNow.getHours()
var minutes = timeNow.getMinutes()
var second = timeNow.getSeconds()

var arr = [second, minutes, hour].join(":");
var arr2 = [day, month, year].join("-")

var arr3 = [arr, arr2];



console.log(arr3.join(" ").toString());