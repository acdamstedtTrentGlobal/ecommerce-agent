const pool = require("../database");

async function getAllProducts() {
    const [rows] = await pool.execute(
        `SELECT id, 
                name,
                brand,
                CAST(price AS DOUBLE) AS price,
                description,
                imageUrl
        FROM products
        `
    );
    return rows;
}

async function getProductById(id) {
    // prepared statement to prevent sql injection
    // sql will execute the statement in two stage 1
    // stage 1: it sets the state of the query
    const [rows] = await pool.execute(
        "SELECT * FROM products WHERE id = ?", [id]
    )
    return rows;
}

module.exports = {
    getAllProducts,
    getProductById
}