var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');

var utils = require('./utils.js');

/**
 * build_relic_tables.js
 *
 * Scrapes the Warframe wiki for active relics and their drop tables/locations.
 */

 /**
  * Given the cheerio html object and the relic name,
  *    build an object for the given relic:
  {
    'drops': [
        part_common, part_common, part_common,
        part_uncommon, part_uncommon,
        part_rare
    ],
    'drop_locations':{
        'mission_type': "mission type",
        "tier": "tier",
        "Rotation": "Rotation",
        "chance": "Chance"
    }
  }
  *
  */
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
        // Removing blueprint from warframe prime parts to match warframe.market.
        .map((part) => {
            if (part.match('(Systems|Chassis|Neuroptics) Blueprint$')){
                return part.substring(0, part.length - 10);
            } else {
                return part;
            }
        });

    // Get relic drop locations.
    var loc_selector = "[title='" + era + "'] tr:contains('" + type + "') tbody tr";
    var raw_locs = $(loc_selector).text().split('\n').filter((x) => x != '');

    console.log(raw_locs);

    var locs = [];

    // First 4 rows are not what we want.
    for (var i = 4; i < raw_locs.length; i++){
        var locsregex = /([A-Z][a-z]+)([a-zA-Z\- 0-9]+)([ABC])([0-9]+(\.[0-9]+)?\%)/g;
        var matches = locsregex.exec(raw_locs[i]);

        if (matches == null){
            continue;
        }

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

/*
 * Given a dict to all the relic details, create a new mapping from
 *    part to relic list.
 */
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

/*
 * Get the dict of relic details and the part to relic mapping, and save to file.
 */
exports.update_relic_info = function(){
    var relicdrop_url = 'http://warframe.wikia.com/wiki/Void_Relic/DropLocationsByRelic';

    // Load html.
    request(relicdrop_url, function(error, response, body){
        const $ = cheerio.load(body);

        // Get list of relics. Note that this page only contains active relics.
        var tabletexts = $('tr', '#mw-content-text').text().split('\n');
        var relics = tabletexts.filter((l) =>
            l.match('(Lith|Meso|Neo|Axi) [A-Z][0-9]')).map((s) => s.trim());

        var relic_details = {};

        // Get relic details for all found relics.
        for (var i = 0; i < relics.length; i++){
           relic_details[relics[i]] = extract_relic_details($, relics[i]);
        }

        // Transform and create the parts-based mapping.
        var parts_details = part_to_relic_mapping(relic_details);

        utils.save_json(utils.path.relic_table, relic_details);
        utils.save_json(utils.path.parts_table, parts_details);
    });
}
