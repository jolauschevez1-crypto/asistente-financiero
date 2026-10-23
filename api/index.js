'use strict';
process.env.TZ='America/Guayaquil';
process.env.APP_MODE='cloud';
require('../BACKEND/src/utils/runtimeConfig').validateCloudEnvironment();
module.exports=require('../BACKEND/src/app');
