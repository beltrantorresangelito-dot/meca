const GenericRpcRepository =
  require('./generic-rpc.repository');

const GenericRpcService =
  require('./generic-rpc.service');

const GenericRpcController =
  require('./generic-rpc.controller');

const {
  createGenericRpcHandler
} = require('./generic-rpc.routes');

module.exports = {
  GenericRpcRepository,
  GenericRpcService,
  GenericRpcController,
  createGenericRpcHandler
};
