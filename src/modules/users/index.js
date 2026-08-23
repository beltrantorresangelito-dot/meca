const UsersRepository = require('./users.repository');
const UsersService = require('./users.service');
const UsersController = require('./users.controller');
const { createUsersHandler } = require('./users.routes');

module.exports = {
  UsersRepository,
  UsersService,
  UsersController,
  createUsersHandler
};
