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

const dateNow = new Date('Fri Aug 29 2025 10:33:18 GMT+0700 (Indochina Time)');



console.log(dateNow.getFullYear());