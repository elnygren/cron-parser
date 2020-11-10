var test = require('tap').test;
var CronExpression = require('./wrapper').CronExpression;

test('expression 31 of month', function(t) {
  try {
    var interval = CronExpression.parse('0 0 31 * *');
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
