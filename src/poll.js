var utils = require('./utils.js')
var request = require('request')
var cheerio = require('cheerio')

exports.check_alerts = function(bot){
    console.log("polling");

    var wanted_list = utils.load_json(utils.path.wanted_list);

    request('http://deathsnacks.com/wf/', function(error, response, body){
        var $ = cheerio.load(body);

        var ts = (new Date()).getTime();

        $('ul.list-group.alerts-container').find('span.badge').each(function(index, elem) {
            var part_name = $(this).text().toLowerCase().trim();

            if (part_name.match(' blueprint$')){
                var part_name = part_name.substring(0, part_name.length - 10);
            }

            var item_id = utils.to_itemid(part_name);

            var users = []
            for (var i = 0; i < wanted_list.length; i++){
                want = wanted_list[i];
                if (want.item_id == item_id){

                    if ((!("last_updated" in want)) || (ts - want.last_updated >= 12 * 60 * 60 * 1000)){
                        users.push(want.userID);
                        wanted_list[i].last_updated = ts;
                    }
                }
            }

            if (users.length > 0){
                bot.sendMessage({
                    to: utils.config.default_channel,
                    message: '<@' + users.join('> @') + '>: Alert for part ' + part_name +
                        '\nhttp://deathsnacks.com/wf/'
                });
            }
        });

        utils.save_json(utils.path.wanted_list, wanted_list);
    });
}

exports.start_polling = function(bot){
    console.log("Start poll");
    // exports.check_alerts(bot);
    setInterval(() => exports.check_alerts(bot), 60 * 1000);
}