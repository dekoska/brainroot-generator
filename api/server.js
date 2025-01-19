require('dotenv').config({ path: './config.env' });

const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(bodyParser.json());
app.use(cookieParser());

// Importowanie tras
const tokenRoutes = require("./routes/token");
const creatorInfoRoutes = require("./routes/creator-info-api");
const videoUploadRoutes = require("./routes/content-video-upload-api");
const supabaseUploadRoutes = require("./routes/supabase");
const shareKitRoutes = require('./routes/share-kit');

// Użycie tras
app.use("/api/token", tokenRoutes);
app.use("/api/creator-info", creatorInfoRoutes);
app.use("/api/video/init", videoUploadRoutes);
app.use("/api/video", supabaseUploadRoutes);
app.use('/api/share-kit', shareKitRoutes);

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

// lsof -i :8080