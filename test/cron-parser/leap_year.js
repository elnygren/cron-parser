var t = require('tap');
var CronExpression = require('./wrapper').CronExpression;

t.only('leap year', function(t) {
  try {
    var interval = CronExpression.parse('0 0 29 2 *');
    var i;
    var d;
    for (i = 0; i < 20; ++i) {
      d = interval.next();
    }
    t.end();
  } catch (err) {
    t.ifError(err, 'Interval parse error');
  }
});
