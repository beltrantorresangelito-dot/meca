const UsersRepository = require('./users.repository');
const UsersService = require('./users.service');
const UsersController = require('./users.controller');

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

function createUsersHandler({
  db,
  hashPassword,
  verifyPassword,
  signToken
} = {}) {
  if (!db) {
    throw new Error('UsersModule requiere db');
  }

  const repository = new UsersRepository(db);
  const service = new UsersService(repository, {
    hashPassword,
    verifyPassword,
    signToken
  });
  const controller = new UsersController(service);

  return async function handleUsersRequest({
    ruta,
    metodo,
    peticion,
    respuesta
  }) {
    if (ruta === '/api/auth/login' && metodo === 'POST') {
      let body;

      try {
        body = await readJsonBody(peticion);
      } catch (error) {
        UsersController.json(
          respuesta,
          500,
          { success: false, error: error.message }
        );
        return true;
      }

      await controller.login(peticion, respuesta, body);
      return true;
    }

    if (ruta === '/api/auth/verify' && metodo === 'GET') {
      await controller.verify(peticion, respuesta);
      return true;
    }

    if (ruta === '/api/auth/cambiar-password' && metodo === 'POST') {
      let body;

      try {
        body = await readJsonBody(peticion);
      } catch (error) {
        UsersController.json(
          respuesta,
          500,
          { success: false, error: error.message }
        );
        return true;
      }

      await controller.changePassword(
        peticion,
        respuesta,
        body
      );
      return true;
    }

    if (ruta === '/api/usuarios/auditores' && metodo === 'GET') {
      await controller.listLegacyAuditors(
        peticion,
        respuesta
      );
      return true;
    }

    if (
      ruta === '/api/usuarios/auditores-activos' &&
      metodo === 'GET'
    ) {
      await controller.listActiveAuditors(
        peticion,
        respuesta
      );
      return true;
    }

    if (ruta === '/api/usuarios' && metodo === 'GET') {
      await controller.listUsers(peticion, respuesta);
      return true;
    }

    if (ruta === '/api/usuarios' && metodo === 'POST') {
      let body;

      try {
        body = await readJsonBody(peticion);
      } catch (error) {
        UsersController.json(
          respuesta,
          500,
          { error: error.message }
        );
        return true;
      }

      await controller.createUser(
        peticion,
        respuesta,
        body
      );
      return true;
    }

    if (ruta === '/api/usuarios/exportar' && metodo === 'GET') {
      await controller.exportUsers(peticion, respuesta);
      return true;
    }

    let match = ruta.match(
      /^\/api\/usuarios\/(\d+)\/password$/
    );

    if (match && metodo === 'PUT') {
      let body;

      try {
        body = await readJsonBody(peticion);
      } catch (error) {
        UsersController.json(
          respuesta,
          500,
          { error: error.message }
        );
        return true;
      }

      await controller.updateUserPassword(
        peticion,
        respuesta,
        match[1],
        body
      );
      return true;
    }

    match = ruta.match(/^\/api\/usuarios\/(\d+)$/);

    if (match && metodo === 'GET') {
      await controller.getUserById(
        peticion,
        respuesta,
        match[1]
      );
      return true;
    }

    if (match && metodo === 'PUT') {
      let body;

      try {
        body = await readJsonBody(peticion);
      } catch (error) {
        UsersController.json(
          respuesta,
          500,
          { error: error.message }
        );
        return true;
      }

      await controller.updateUser(
        peticion,
        respuesta,
        match[1],
        body
      );
      return true;
    }

    if (match && metodo === 'DELETE') {
      await controller.deleteUser(
        peticion,
        respuesta,
        match[1]
      );
      return true;
    }

    return false;
  };
}

module.exports = {
  createUsersHandler
};
