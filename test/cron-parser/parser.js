var test = require('tap').test;
var CronParser = require('./wrapper').CronExpression;

const crontabFile = `
# Comment line (ignore)
ENV1="test1"
ENV2="test2"

*/10 * * * * /path/to/exe
*/10 * * * * /path/to/exe
0 09-18 * * 1-5 /path/to/exe
`

test('load crontab file', function(t) {
  CronParser.parseFile(crontabFile, function(err, result) {
    t.ifError(err, 'File read error');
    t.ok(result, 'Crontab parsed parsed');

    t.equal(Object.keys(result.variables).length, 2, 'variables length matches');
    t.equal(Object.keys(result.errors).length, 0, 'errors length matches');
    t.equal(result.expressions.length, 3, 'expressions length matches');

    // Parse expressions
    var next = null;

    next = result.expressions[0].next();
    t.ok(next, 'first date');

    next = result.expressions[1].next();
    t.ok(next, 'second date');

    next = result.expressions[2].next();
    t.ok(next, 'third date');

    t.end();
  });
});

test('no next date', function(t) {
  var options = {
    currentDate: new Date(2014, 0, 1),
    endDate: new Date(2014, 0, 1)
  };

  try {
    var interval = CronParser.parseExpression('* * 2 * *', options);
    t.equal(interval.hasNext(), false);
  } catch (err) {
    t.ifError(err, 'Parse read error');
  }

  t.end();
});

test('prev with CurrentDate greater than 0ms should work', function(t) {
  var options = {
    currentDate: new Date('2017-06-13T18:21:25.002Z'),
    reverse: true,
  };

  var interval = CronParser.parseExpression('*/5 * * * * *', options);
  var prev = interval.prev();
  t.equal(prev.getSeconds(), 25);

  t.end();
});
