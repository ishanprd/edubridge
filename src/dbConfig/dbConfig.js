import mongoose from "mongoose";


export async function Connect() {
    try {
        mongoose.connect(process.env.MONGO_URL)
        const connection = mongoose.connection;
        connection.on('connected', () => {
            console.log("MongoDb Connected");
            console.log(mongoose.connection.collections);
            console.log("Database connected to:", mongoose.connection.name);
        });
        


        connection.on('error', (err) => {
            console.log("MongoDb Connectin error:" + err);
            process.exit()
        })


    } catch (error) {
        console.log('something went wrong in connecting to DB');
        console.log(error);
        
    }
    
}
