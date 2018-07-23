const Hapi = require('hapi');
const http = require('request');
const Joi = require('joi');
const secrets = require('./secrets');

// create server
const server = Hapi.server({
    host: secrets.server.host,
    port: secrets.server.port,
    // routes: {cors: {origin: ['http://*.github.com', 'https://*.github.com']} }
});

// register routes
server.route({
    method:'GET',
    path:'/',
    handler:function(request,h) {
        return "This route does not do anything. Use GET /list to get a paginated list of collages (id, thumbnail), GET /get{id} to get collage data or POST /save.";
    }
});
server.route({
    method:'GET',
    path:'/check/{url}',
    handler:function(request,h) {
        const url = decodeURIComponent(request.params.url);
        // check url headers
        return new Promise((resolve, reject) => {
            http.head(url, (err, res, body) => {
                if (err) {
                    reject(err);
                } else {
                    if (res.headers['x-frame-options'] || res.headers['X-Frame-Options']) {
                        resolve(403);
                    } else {
                        resolve(200);
                    }
                }
            });
        }).then(statusCode => {
            return h.response({code: statusCode, status: statusCode === 200 ? 'allowed' : 'forbidden'}).code(statusCode);
        }).catch(err => {
            return h.response(err).code(500);
        });
    }
});
server.route({
    method:'GET',
    path:'/list/{page?}',
    handler: async function(request,h) {
        const db = request.mongo.db;
        const page = request.params.page || 0;
        const amount = 12;
        try {
            const count = await db.collection('posts').count({});
            const posts = await db.collection('posts').find({}, {
                sort: {created_at: -1},
                skip: page * amount,
                limit: amount,
                fields: {_id: 1, thumbnail: 1, author: 1, title: 1} // this should be renamed to 'projection' in newer version
            }).toArray();
            return {
                count,
                hasPrev: page >= 2,
                hasNext: count - ((page + 1) * amount) > 0,
                posts
            };
        }
        catch (err) {
            return h.response([]).code(200);
        }
    }
});
server.route({
    method:'GET',
    path:'/get/{id}',
    handler: async function(request,h) {
        if (!request.params.id) return null;
        const db = request.mongo.db;
        const ObjectID = request.mongo.ObjectID;
        try {
            return await db.collection('posts').findOne({_id: new ObjectID(request.params.id)});
        }
        catch (err) {
            return null;
        }
    }
});
server.route({
    method:'POST',
    path:'/save',
    handler: async function(request,h) {
        const db = request.mongo.db;
        const doc = request.payload;
        // normalize title & author
        doc.title = doc.title ? doc.title : 'Untitled';
        doc.author = doc.author ? doc.author : 'Anonymous';
        // add created at to payload
        doc.created_at = new Date();
        // remove state
        doc.items = doc.items.map(item => {
            delete item.state;
            return item;
        });
        // add thumbnail
        doc.thumbnail = null;
        // save result
        try {
            const cursor = await db.collection('posts').insertOne(doc);
            if (cursor) {
                return h.response({status: 'ok', code: 200}).code(200);
            } else {
                return h.response({status: 'error', code: 400}).code(400);
            }
        }
        catch (err) {
            return null;
        }
    },
    options: {
        validate: {
            payload: Joi.object().keys({
            title: Joi.string().allow(null),
            author: Joi.string().allow(null),
            items: Joi.array().min(1).required().items(
                Joi.object().keys({
                    width: Joi.number().required(),
                    height: Joi.number().required(),
                    x: Joi.number().required(),
                    y: Joi.number().required(),
                    clip: Joi.array().required().allow([]).items(
                        Joi.array().items(
                            Joi.number().required(),
                            Joi.number().required()
                        )
                    ),
                    angle: Joi.number().required(),
                    childWidth: Joi.number().required(),
                    childHeight: Joi.number().required(),
                    childX: Joi.number().required(),
                    childY: Joi.number().required(),
                    url: Joi.string().required(),
                    state: Joi.string().allow(null)
                })
            )
        })
        }
    }
});

// Start the server
async function start() {
    try {
        // register mongo db
        await server.register({
            plugin: require('hapi-mongodb'),
            options: {
                url: `mongodb://${secrets.mongo.user}:${secrets.mongo.pass}@${secrets.mongo.name}`,
                settings: {
                    poolSize: 10
                },
                decorate: true
            }
        });
        await server.start();
    }
    catch (err) {
        console.log(err);
        process.exit(1);
    }

    console.log('Server running at:', server.info.uri);
}

start();