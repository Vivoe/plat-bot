var fs = require('fs');
var relic_table_builder = require('./build_relic_tables.js');

// String convience functions.
String.prototype.pad = function(n){
    var padstr = ' '.repeat(n - this.length);
    return this + padstr;
}

String.prototype.capitalize = function(){
    return this.charAt(0).toUpperCase() + this.slice(1);
}

exports.tokenize = function(s){
    return s.match(/[^\s"]+|"([^"]*)"/g);
}

exports.to_itemid = function(item){
    return item.toLowerCase().replace(/ /g, '_');
}

exports.median = function(arr){
    var mid = Math.floor(arr.length / 2);
    return arr.sort((a, b) => a - b)[mid];
}

exports.format_seconds = function(seconds){
    var days = Math.floor(seconds / (3600*24));
    seconds  -= days*3600*24;
    var hrs   = Math.floor(seconds / 3600);
    seconds  -= hrs*3600;
    var mnts = Math.floor(seconds / 60);
    seconds  -= mnts*60;

    var time_str =
        days + 'd ' +
        hrs + 'h ' +
        mnts + 'm ' +
        seconds + 's';

    return time_str;
}

exports.idx_to_rarity = function(idx) {
    if (idx <= 2){
        return 'common';
    } else if (idx <= 4){
        return 'uncommon';
    } else {
        return 'rare';
    }
}

// File loader functions.
exports.load_admin_channels = function(){
    var admin_channels =
        fs.readFileSync('data/admin_channels.txt', 'utf8')
        .split('\n').filter((x) => x != '');
    return admin_channels;
}

exports.load_pricemods = function(){
    if (!fs.existsSync('data/pricemods.json')){
        fs.writeFileSync('data/pricemods.json', '{}', 'utf8');
        return {};
    }

    var pricemods = JSON.parse(fs.readFileSync('data/pricemods.json', 'utf8'));
    return pricemods;
}

exports.save_pricemods = function(pricemods){
    fs.writeFileSync('data/pricemods.json', JSON.stringify(pricemods) + '\n', 'utf8');
}

exports.load_relics_table = function(){
    if (!fs.existsSync('data/relic_table.json')){
        relic_table_builder.update_relic_info();
    }

    var relic_table = JSON.parse(fs.readFileSync('data/relic_table.json'));

    return relic_table;
}

exports.load_parts_table = function(){
    if (!fs.existsSync('data/parts_table.json')){
        relic_table_builder.update_relic_info();
    }

    var parts_table = JSON.parse(fs.readFileSync('data/parts_table.json'));

    return parts_table;
}