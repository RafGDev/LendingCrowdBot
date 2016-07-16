const Promise = require("bluebird");
const config = require("../config.js");

const options = {
  promiseLib: Promise,
};

const pgPromise = require("pg-promise")(options);
const connectionString = `postgres://${config.DB_USER}:${config.DB_PASS}@localhost/financialBotApi`;

const db = pgPromise(connectionString);

module.exports = db;
