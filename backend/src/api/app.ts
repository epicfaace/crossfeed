import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import { handler as healthcheck } from './healthcheck';
import * as auth from './auth';
import { login } from './auth';
import * as domains from './domains';
import * as reports from './reports';
import * as organizations from './organizations';
import * as scans from './scans';
import * as users from './users';

const handlerToExpress = (handler) => async (req, res, next) => {
  const { statusCode, body } = await handler(
    {
      pathParameters: req.params,
      requestContext: req.requestContext,
      body: JSON.stringify(req.body || '{}'),
      headers: req.headers,
      path: req.originalUrl
    },
    {}
  );
  try {
    const parsedBody = JSON.parse(body);
    res.status(statusCode).json(parsedBody);
  } catch (e) {
    // Not a JSON body
    res.status(statusCode).send(body);
  }
};

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.get('/', handlerToExpress(healthcheck));
app.post('/auth/login', handlerToExpress(auth.login));
app.post('/auth/callback', handlerToExpress(auth.callback));

const authenticatedRoute = express.Router();
authenticatedRoute.use(async (req, res, next) => {
  req.requestContext = {
    authorizer: await auth.authorize({
      authorizationToken: req.headers.authorization
    })
  };
  if (
    !req.requestContext.authorizer.id ||
    req.requestContext.authorizer.id === 'cisa:crossfeed:anonymous'
  ) {
    return res.status(403).send('Not logged in');
  }
  return next();
});

authenticatedRoute.post('/domain/search', handlerToExpress(domains.list));
authenticatedRoute.get('/domain/:domainId', handlerToExpress(domains.get));
authenticatedRoute.post('/report/search', handlerToExpress(reports.list));
authenticatedRoute.get('/report/:reportId', handlerToExpress(reports.get));
authenticatedRoute.get('/scans', handlerToExpress(scans.list));
authenticatedRoute.post('/scans', handlerToExpress(scans.create));
authenticatedRoute.put('/scans/:scanId', handlerToExpress(scans.update));
authenticatedRoute.delete('/scans/:scanId', handlerToExpress(scans.del));
authenticatedRoute.get('/organizations', handlerToExpress(organizations.list));
authenticatedRoute.get(
  '/organizations/public',
  handlerToExpress(organizations.listPublicNames)
);
authenticatedRoute.get(
  '/organizations/:organizationId',
  handlerToExpress(organizations.get)
);
authenticatedRoute.post(
  '/organizations',
  handlerToExpress(organizations.create)
);
authenticatedRoute.put(
  '/organizations/:organizationId',
  handlerToExpress(organizations.update)
);
authenticatedRoute.delete(
  '/organizations/:organizationId',
  handlerToExpress(organizations.del)
);
authenticatedRoute.post(
  '/organizations/:organizationId/roles/:roleId/approve',
  handlerToExpress(organizations.approveRole)
);
authenticatedRoute.post(
  '/organizations/:organizationId/roles/:roleId/remove',
  handlerToExpress(organizations.removeRole)
);
authenticatedRoute.get('/users', handlerToExpress(users.list));
authenticatedRoute.get('/users/me', handlerToExpress(users.me));
authenticatedRoute.post('/users', handlerToExpress(users.invite));
authenticatedRoute.put('/users/:userId', handlerToExpress(users.update));
authenticatedRoute.delete('/users/:userId', handlerToExpress(users.del));

app.use(authenticatedRoute);

export default app;