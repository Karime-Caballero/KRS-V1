export default {
    mongo: {
        uri: process.env.MONGO_URI || 'mongodb+srv://rl4357011:cjIZTFJntLwmqOLR@cluster0.sike1gh.mongodb.net/?retryWrites=true&w=majority',
        dbName: process.env.MONGO_DB_NAME || 'Cluster0'
    }
};
