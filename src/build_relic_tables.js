var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');

var utils = require('./utils.js');

extract_relic_details = function($, relic){

    var tokens = relic.split(' ');
    var era = tokens[0];
    var type = tokens[1];

    // Get possible drops.
    var drop_selector = "[title='" + era + "'] td:contains('" + type + "') ul";
    var raw_drops = $(drop_selector).text().split('\n');
    var drops = raw_drops
        .filter((x) => x != '')
        .map((s) => s.trim())
        .map((part) => { // Removing blueprint from warframe prime parts.
            if (part.match('(Systems|Chassis|Neuroptics) Blueprint$')){
                return part.substring(0, part.length - 10);
            } else {
                return part;
            }
        });

    // Get relic drop locations.
    var loc_selector = "[title='" + era + "'] tr:contains('" + type + "') tbody tr";
    var raw_locs = $(loc_selector).text().split('\n').filter((x) => x != '');

    var locs = [];

    // First 4 rows are not what we want.
    for (var i = 4; i < raw_locs.length; i++){
        var locsregex = /([A-Z][a-z]+)([a-zA-Z\- 0-9]+)([ABC])([0-9]+(\.[0-9]+)?\%)/g;
        var matches = locsregex.exec(raw_locs[i]);

        var loc = {
            'mission_type': matches[1],
            'tier': matches[2],
            'rotation': matches[3],
            'chance': matches[4]
        };

        locs.push(loc);
    }

    var relic_details = {
        'drops': drops,
        'drop_locations': locs
    };

    return relic_details;
}

part_to_relic_mapping = function(relic_details){

    var parts = {};

    for (var relic in relic_details){
        var drops = relic_details[relic]['drops'];

        for (var i = 0; i < drops.length; i++){
            var part = utils.to_itemid(drops[i]);
            var drop_rarity = relic + ' ' + utils.idx_to_rarity(i);

            if (part in parts){
                parts[part].push(drop_rarity);
            } else {
                parts[part] = [drop_rarity];
            }
        }
    }

    return parts;
}

exports.update_relic_info = function(callback){
    var relicdrop_url = 'http://warframe.wikia.com/wiki/Void_Relic/DropLocationsByRelic';

    request(relicdrop_url, function(error, response, body){
        const $ = cheerio.load(body);

        var tabletexts = $('tr', '#mw-content-text').text().split('\n');
        var relics = tabletexts.filter((l) =>
            l.match('(Lith|Meso|Neo|Axi) [A-Z][0-9]')).map((s) => s.trim());

        var relic_details = {};

        for (var i = 0; i < relics.length; i++){
           relic_details[relics[i]] = extract_relic_details($, relics[i]);
        }

        var parts_details = part_to_relic_mapping(relic_details);

        fs.writeFileSync('data/relic_table.json', JSON.stringify(relic_details, null, 2));
        fs.writeFileSync('data/parts_table.json', JSON.stringify(parts_details, null, 2));

        if (callback) callback();
    });
}
