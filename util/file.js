const fs = require('fs');

function deleteFile(filePath) {
    fs.unlink(filePath, (err) => {
        if (err) {
            throw (err)
        };
    });

}


exports.deleteFile = deleteFile;