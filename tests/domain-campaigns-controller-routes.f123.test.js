const test =
  require('node:test');

const assert =
  require('node:assert/strict');

const fs =
  require('node:fs');

const path =
  require('node:path');


const controllerSource =
  fs.readFileSync(
    path.join(
      __dirname,
      '..',
      'src',
      'modules',
      'domain',
      'domain.controller.js'
    ),
    'utf8'
  );


const routesSource =
  fs.readFileSync(
    path.join(
      __dirname,
      '..',
      'src',
      'modules',
      'domain',
      'domain.routes.js'
    ),
    'utf8'
  );


test(
  'F123-HTTP-001 controller crea campaña',
  () => {
    assert.match(
      controllerSource,
      /async\s+createCampaign\s*\(/
    );

    assert.match(
      controllerSource,
      /this\.service\.createCampaign/
    );
  }
);


test(
  'F123-HTTP-002 controller actualiza campaña',
  () => {
    assert.match(
      controllerSource,
      /async\s+updateCampaign\s*\(/
    );

    assert.match(
      controllerSource,
      /this\.service\.updateCampaign/
    );
  }
);


test(
  'F123-HTTP-003 controller cambia estado',
  () => {
    assert.match(
      controllerSource,
      /async\s+setCampaignActive\s*\(/
    );

    assert.match(
      controllerSource,
      /this\.service\.setCampaignActive/
    );
  }
);


test(
  'F123-HTTP-004 POST campañas soportado',
  () => {
    assert.match(
      routesSource,
      /ruta\s*===\s*['"]\/api\/domain\/campanas['"][\s\S]*metodo\s*===\s*['"]POST['"]/
    );
  }
);


test(
  'F123-HTTP-005 PUT campaña usa id dinámico',
  () => {
    assert.match(
      routesSource,
      /api\\\/domain\\\/campanas\\\/\(\\d\+\)/
    );

    assert.match(
      routesSource,
      /metodo\s*===\s*['"]PUT['"]/
    );
  }
);


test(
  'F123-HTTP-006 PATCH estado campaña soportado',
  () => {
    assert.match(
      routesSource,
      /campanas\\\/\(\\d\+\)\\\/estado/
    );

    assert.match(
      routesSource,
      /metodo\s*===\s*['"]PATCH['"]/
    );
  }
);


test(
  'F123-HTTP-007 no introduce DELETE físico',
  () => {
    assert.doesNotMatch(
      routesSource,
      /metodo\s*===\s*['"]DELETE['"][\s\S]*campanas/
    );
  }
);

test(
  'F125-HTTP-008 controller respeta status funcional',
  () => {
    assert.match(
      controllerSource,
      /error\?\.\s*status|error\?\.status/
    );

    assert.match(
      controllerSource,
      /ASSIGNMENT_OVERLAP/
    );

    assert.match(
      controllerSource,
      /409/
    );
  }
);