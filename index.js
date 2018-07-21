const Hapi = require('hapi');
const Joi = require('joi');
const secrets = require('./secrets');

// create server
const server = Hapi.server({
    host: 'localhost',
    port: 8000,
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
    path:'/list/{page?}',
    handler: async function(request,h) {
        const db = request.mongo.db;
        const amount = 12;
        try {
            return await db.collection('posts').find({}, {
                sort: {created_at: -1},
                skip: (request.params.page || 0) * amount,
                limit: amount,
                projection: {thumbnail: 1, author: 1, title: 1}
            });
        }
        catch (err) {
            return [];
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
    config: {
        handler: async function(request,h) {
            if (!request.params.id) return null;
            const db = request.mongo.db;
            const doc = request.payload;
            // add created at to payload
            doc.created_at = new Date();
            // save result
            try {
                return await db.collection('posts').insertOne(doc);
            }
            catch (err) {
                return null;
            }
        },
        validate: { 
            payload: {
                title: Joi.string().required(),
                author: Joi.string().required(),
                items: Joi.array().items(
                    Joi.object().keys({
                        width: Joi.number().required(),
                        height: Joi.number().required(),
                        x: Joi.number().required(),
                        y: Joi.number().required(),
                        clip: Joi.array().required(),
                        angle: Joi.number().required(),
                        childWidth: Joi.number().required(),
                        childHeight: Joi.number().required(),
                        childX: Joi.number().required(),
                        childY: Joi.number().required(),
                    })
                ).required()
            }
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
};

start();