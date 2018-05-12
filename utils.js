String.prototype.pad = function(n){
    var padstr = ' '.repeat(n - this.length);
    return this + padstr;
}

String.prototype.capitalize = function(){
    return this.charAt(0).toUpperCase() + this.slice(1);
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
