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
    var raw_tokens = s.match(/[^\s"]+|"([^"]*)"/g);
    return raw_tokens.map(function(s){
        if (s[0] == '"' && s[s.length - 1] == '"'){
            return s.substring(1, s.length - 1);
        } else {
            return s;
        }
    });
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

/*
 * File helpers.
 */

// Might be good to move to a separate file location for general config.
exports.path = {
    'relic_table': 'data/relic_table.json',
    'parts_table': 'data/parts_table.json',
    'pricemods': 'data/pricemods.json',
    'wanted_list': 'data/wanted_list.json'
}

exports.load_json = function(file){
    var json = fs.readFileSync(file, 'utf8');
    return JSON.parse(json);
}

exports.save_json = function(file, object){
    fs.writeFileSync(file, JSON.stringify(object, null, 2) + '\n', 'utf8');
}

exports.create_if_not_exists = function(file, object){
    if (!fs.existsSync(file)){
        exports.save_json(file, object);
    }
}
