const { convertToModelMessages } = require('ai');
try {
  const msgs = [{ id: '1', role: 'user', content: 'hello' }];
  const out = convertToModelMessages(msgs);
  console.log(out);
} catch (err) {
  console.error(err.stack);
}
