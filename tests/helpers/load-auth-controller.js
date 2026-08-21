const path = require('node:path');

function loadAuthController({ user = null, onUpdateLogin = async () => ({ rowCount: 1 }) } = {}) {
  const authPath = path.resolve(__dirname, '../../controllers/auth.controller.js');
  const userModelPath = path.resolve(__dirname, '../../models/Usuario.model.js');
  const databasePath = path.resolve(__dirname, '../../models/database.js');

  const previous = {
    auth: require.cache[authPath],
    userModel: require.cache[userModelPath],
    database: require.cache[databasePath],
  };

  delete require.cache[authPath];

  require.cache[userModelPath] = {
    id: userModelPath,
    filename: userModelPath,
    loaded: true,
    exports: {
      findByUsername: async () => user,
    },
  };

  require.cache[databasePath] = {
    id: databasePath,
    filename: databasePath,
    loaded: true,
    exports: {
      pool: { query: onUpdateLogin },
      query: onUpdateLogin,
    },
  };

  const controller = require(authPath);

  return {
    controller,
    restore() {
      delete require.cache[authPath];

      const targets = {
        auth: authPath,
        userModel: userModelPath,
        database: databasePath,
      };

      for (const [key, target] of Object.entries(targets)) {
        const previousValue = previous[key];
        if (previousValue) require.cache[target] = previousValue;
        else delete require.cache[target];
      }
    },
  };
}

function createResponseRecorder() {
  return {
    statusCode: null,
    headers: null,
    rawBody: '',
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body = '') {
      this.rawBody = body;
    },
    json() {
      return this.rawBody ? JSON.parse(this.rawBody) : null;
    },
  };
}

module.exports = { loadAuthController, createResponseRecorder };
