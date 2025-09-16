const express = require('express');
const multer = require('multer');
const imageSize = require('image-size');
const sharp = require('sharp');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();

const port = process.env.PORT || 4000;

let width, height, format, outputFilePath;

// Ensure upload directory exists
const dir = "public";
const subDirectory = "public/uploads";

if (!fs.existsSync(dir)) fs.mkdirSync(dir);
if (!fs.existsSync(subDirectory)) fs.mkdirSync(subDirectory);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Multer storage setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, subDirectory);
    },
    filename: function (req, file, cb) {
        cb(
            null,
            file.fieldname + '-' + Date.now() + path.extname(file.originalname)
        );
    },
});

// File filter (no mimetype checking)
const imageFilter = function (req, file, cb) {
    cb(null, true);
};

const upload = multer({ storage: storage, fileFilter: imageFilter });

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


app.post('/processimage', upload.single('file'), (req, res) => {
    format = req.body.myfile;
    width = parseInt(req.body.width);
    height = parseInt(req.body.height);

    if (req.file) {
        console.log('Uploaded file path:', req.file.path);

        // Use original dimensions if not provided
        if (isNaN(width) || isNaN(height)) {
            const dimensions = imageSize(req.file.path);
            console.log('Original dimensions:', dimensions);
            width = dimensions.width;
            height = dimensions.height;
        }

        processImage(width, height, req, res);
    } else {
        res.status(400).send("No file uploaded");
    }
});

function processImage(width, height, req, res) {
    const fileName = `${Date.now()}-output.${format}`;
    outputFilePath = path.join(__dirname, 'public/uploads', fileName);

    sharp(req.file.path)
        .resize(width, height)
        .toFile(outputFilePath, (err, info) => {
            if (err) {
                console.error("Sharp error:", err);
                return res.status(500).send("Image processing failed.");
            }

            console.log("Processed file:", outputFilePath);

            // Use full path for download
            res.download(outputFilePath, fileName, (err) => {
                if (err) {
                    console.error("Download error:", err);
                    return res.status(500).send("Failed to send file.");
                }

                // Clean up after download
                try {
                    fs.unlinkSync(req.file.path); // Delete uploaded original
                    fs.unlinkSync(outputFilePath); // Delete resized image
                    console.log("Temporary files deleted.");
                } catch (cleanupErr) {
                    console.error("Cleanup error:", cleanupErr);
                }
            });
        });
}

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

