---                FOLLOWING FILE CONTAINS SCHEMA FOR JOBS DATABASE
---      MENTION DATE, TABLE, AUTHOR AND DESCRIPTION ON TIME OF ADDING NEW QUERIES
---                   THE LATEST QUERIES WILL APPEAR AT THE TOP


-- DESCRIPTION:     ADDING COUNTRIES, STATES AND CITIES IN LOCAL DATABASE
-- DATED:           DEC, 02-2024
-- AUTHOR:          AHMED HASSAN

-- TABLE:   COUNTRIES
CREATE TABLE countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code CHAR(2) NOT NULL UNIQUE
);

-- TABLE:   STATES
CREATE TABLE states (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code CHAR(2) NOT NULL,
    country_id INT NOT NULL,
    CONSTRAINT fk_country FOREIGN KEY (country_id) REFERENCES countries (id) ON DELETE CASCADE
);

-- TABLE:   CITIES
CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    state_id INT NOT NULL,
    CONSTRAINT fk_state FOREIGN KEY (state_id) REFERENCES states (id) ON DELETE CASCADE
);
