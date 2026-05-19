const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/mobaudit').then(async () => {
  await mongoose.connection.collection('scanreports').updateMany({}, { $set: { dynamic_status: 'not_started', dynamic_report_data: null } });
  console.log('Reset done!');
  process.exit();
});
