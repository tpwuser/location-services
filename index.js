const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

const { PORT, DB_USER, DB_PASSWORD, DB_NAME, CSC_API_KEY } = process.env;

const pool = new Pool({
  host: "localhost",
  port: "5432",
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
});

let url = 'https://api.countrystatecity.in/v1/';
const apiKey = CSC_API_KEY;

const fetchCountries = async () => {
  try {
    const countryUrl = url + 'countries/'
    const response = await getRegionalData(countryUrl);
    return response;
  } catch (error) {
    console.error('Error fetching countries:', error.response?.data || error.message);
    throw error;
  }
};

const fetchCountryCodes = async () => {
  try {
    const result = await pool.query(`
        SELECT t1.id AS id, t1.code AS code 
        FROM countries t1
        ORDER BY id;
      `
    );
    return result;
  } catch (error) {
    console.error('Error Fetching Country Codes:', error.response?.data || error.message);
    throw error;
  }
}

const fetchStates = async () => {
  try {
    const response = await fetchCountryCodes();
    const countryCodesList = response.rows;
    const statesList = [];

    for (const country of countryCodesList) {
      const stateUrl = url + `countries/${country.code}/states`;
      const response = await getRegionalData(stateUrl);

      if (response.length > 0) {
        const updatedStates = response.map(state => ({
          ...state,
          country_id: country.id
        }));

        statesList.push(...updatedStates);
      }
    }

    return statesList;
  } catch (error) {
    console.error("Error fetching states:", error.message);
    throw error;
  }
};

const fetchStateCodes = async () => {
  try {
    const result = await pool.query(`
      SELECT 
      t1.code AS country_code, 
      t2.id AS state_id, 
      t2.code AS state_code 
      FROM countries t1 
      JOIN states t2 ON t1.id = t2.country_id 
      ORDER BY t1.id, t2.id;
      `
    );
    return result;
  } catch (error) {
    console.error('Error Fetching State Codes:', error.response?.data || error.message);
    throw error;
  }
}

const fetchCities = async () => {
  try {
    const response = await fetchStateCodes();
    const stateCodesList = response.rows;
    const citiesList = [];

    for (const state of stateCodesList) {
      const cityUrl = url + `countries/${state.country_code}/states/${state.state_code}/cities`.replace(/\s+/g, '');
      const response = await getRegionalData(cityUrl);

      if (response.length > 0) {
        const updatedCities = response.map(city => ({
          ...city,
          state_id: state.state_id
        }));

        citiesList.push(...updatedCities);
      }
    }

    return citiesList;
  } catch (error) {
    console.error("Error fetching states:", error.message);
    throw error;
  }
};

const getRegionalData = async (uri) => {
  try {
    const response = await axios.get(uri, {
      headers: {
        'X-CSCAPI-KEY': apiKey,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching countries:', error.response?.data || error.message);
    throw error;
  }
};

const updateCountries = async () => {
  try {
    const countries = await fetchCountries();
    const query = `
      INSERT INTO countries (id, name, code)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE 
      SET name = EXCLUDED.name,
          code = EXCLUDED.code;
    `;
  
    for (const country of countries) {
      await pool.query(query, [
        country.id,
        country.name,
        country.iso2,
      ]);
    }

    return 'Countries Table Updated..';
  } catch (error) {
    return `Error updating countries:, ${error.message}`;
  }
}

const updateStates = async () => {
  try {
    const statesList = await fetchStates();
    const query = `
      INSERT INTO states (id, name, code, country_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE 
      SET name = EXCLUDED.name,
          code = EXCLUDED.code,
          country_id = EXCLUDED.country_id;
    `;
  
    for (const state of statesList) {
      await pool.query(query, [
        state.id,
        state.name,
        state.iso2,
        state.country_id,
      ]);
    }

    return 'States Table Updated..';
  } catch (error) {
    console.error("Error updating states:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

const updateCities = async () => {
  try {
    const citiesList = await fetchCities();
    const query = `
      INSERT INTO cities (id, name, state_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE 
      SET name = EXCLUDED.name,
          state_id = EXCLUDED.state_id;
    `;
  
    for (const city of citiesList) {
      await pool.query(query, [
        city.id,
        city.name,
        city.state_id,
      ]);
    }

    return 'Cities Table Updated..';
  } catch (error) {
    console.error("Error updating states:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

const fixStateCodes = async () => {
  try {
    const query = `
      UPDATE states
      SET code = REPLACE(code, '-', '');
    `;
    await pool.query(query);
    return "States Table TYPO's Fixed..";
  } catch (error) {
    console.error("Error Fixing States Code:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

app.get("/test", async (req, res) => {
  try {
    const result = await fetchCities('pk', 'is');
    res.json(result);
  } catch (error) {
    console.error("Error fetching countries:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/countries", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM countries");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching countries:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/states", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM states");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching states:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/cities", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM cities");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching cities:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/states/:id", async (req, res) => {
  const { id } = req.params;
  console.log(id);
  try {
    const result = await pool.query(`SELECT * FROM states WHERE country_id = ${id}`);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching states:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/cities/:id", async (req, res) => {
  const { id } = req.params;
  console.log(id);
  try {
    const result = await pool.query(`SELECT * FROM cities WHERE state_id = ${id}`);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching states:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/populateLocationTables", async (req, res) => {
  try {
    const countryListRes = await updateCountries();
    if (countryListRes) console.log(countryListRes);
    
    const stateListRes = await updateStates();
    if (stateListRes) console.log(stateListRes);

    const stateCodeRes = await fixStateCodes();
    if (stateCodeRes) console.log(stateCodeRes);

    const cityListRes = await updateCities();
    if (cityListRes) console.log(stateListRes);

    res.json({
      COUNTRIES: countryListRes,
      STATES: stateListRes,
      STATES_CODE_TYPOS: stateCodeRes,
      CITIES: cityListRes,
    });
  } catch (error) {
    console.error("Error Updating Tables:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


app.get("/updateStates", async (req, res) => {
  try {
    const response = await updateCities();
    res.json(response);
  } catch (error) {
    console.error("Error updating states:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
