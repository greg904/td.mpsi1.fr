CREATE TABLE students (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    in_group_even BOOLEAN NOT NULL
);

CREATE TABLE units (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    exercise_count INTEGER NOT NULL,
    -- For each group, the date when the students have to present their
    -- exercises.
    deadline_group_even TEXT NOT NULL,
    deadline_group_odd TEXT NOT NULL
);

CREATE TABLE exercise (
    unit_id INTEGER NOT NULL,
    index_ INTEGER NOT NULL,
    -- For whatever reason, the teacher said that students should not do this
    -- exercise.
    blocked BOOLEAN NOT NULL DEFAULT FALSE,
    -- Corrected by the teacher for the even group
    teacher_corrected_for_group_even BOOLEAN NOT NULL DEFAULT FALSE,
    -- Corrected by the teacher for the odd group
    teacher_corrected_for_group_odd BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (unit_id) REFERENCES units(id),
    UNIQUE(unit_id, index_)
);

CREATE TABLE exercise_student_state (
    student_id INTEGER NOT NULL,
    unit_id INTEGER NOT NULL,
    exercise INTEGER NOT NULL,
    -- 0: Reserved by the student
    -- 1: Presented by the student
    state INTEGER NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (unit_id) REFERENCES units(id),
    UNIQUE(student_id, unit_id, exercise)
);

CREATE TABLE exercise_corrections (
    id INTEGER PRIMARY KEY,
    unit_id INTEGER NOT NULL,
    unit_exercise INTEGER NOT NULL,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    picture_digest TEXT NOT NULL,
    FOREIGN KEY (unit_id) REFERENCES units(id),
    FOREIGN KEY (created_by) REFERENCES students(id),
    UNIQUE(unit_id, unit_exercise, picture_digest)
);

INSERT INTO students (username, full_name, in_group_even) VALUES ("antoine", "Cybélia Antoine", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("audoin", "Anatol Audoin", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("yadrin", "Alexei Yadrin", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("baril", "Eloïse Baril", true);
INSERT INTO students (username, full_name, in_group_even) VALUES ("barrier", "Robin Barrier", true);
INSERT INTO students (username, full_name, in_group_even) VALUES ("baulard", "Nathan Baulard", true);
INSERT INTO students (username, full_name, in_group_even) VALUES ("beer-boussoukaia", "Matteo Beer Boussoukaia", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("berger", "Timothé Berger", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("cartaux", "Eve Cartaux", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("clinard", "Rémi Clinard", true);
INSERT INTO students (username, full_name, in_group_even) VALUES ("cossart", "Mathis Cossart", true);
INSERT INTO students (username, full_name, in_group_even) VALUES ("depoire-ferrer", "Greg Depoire--Ferrer", true);
INSERT INTO students (username, full_name, in_group_even) VALUES ("dherissart", "Andréa Dherissart", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("dromard", "Baptiste Dromard", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("fracchia", "Jonah Fracchia", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("genot", "Clément Genot", true);
INSERT INTO students (username, full_name, in_group_even) VALUES ("ghellab", "Hamza Ghellab", true);
INSERT INTO students (username, full_name, in_group_even) VALUES ("girard", "Enzo Girard", true);
INSERT INTO students (username, full_name, in_group_even) VALUES ("girardot", "Léa Girardot", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("guyot", "Alice Guyot", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("hemon", "Tristan Hemon", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("houze", "Hugo Houze", true);
INSERT INTO students (username, full_name, in_group_even) VALUES ("jeunehomme-leger", "Etienne Jeunehomme-Leger", true);
INSERT INTO students (username, full_name, in_group_even) VALUES ("joseph", "Axelle Joseph", true);
INSERT INTO students (username, full_name, in_group_even) VALUES ("kellal", "Ramy Kellal", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("krasnicki", "Sarah Krasnicki", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("lechere", "Hugo Lechere", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("linel", "Marina Linel", true);
INSERT INTO students (username, full_name, in_group_even) VALUES ("loones", "Victor Loones", true);
INSERT INTO students (username, full_name, in_group_even) VALUES ("lucyszyn", "Edward Lucyszyn", true);
INSERT INTO students (username, full_name, in_group_even) VALUES ("martin", "Lucas Martin", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("massot", "May Massot", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("menin", "Amélie Menin", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("merzouk", "Ayman Merzouk", true);
INSERT INTO students (username, full_name, in_group_even) VALUES ("meyer", "Thomas Meyer", true);
INSERT INTO students (username, full_name, in_group_even) VALUES ("mina-passi", "Hugo Mina Passi", true);
INSERT INTO students (username, full_name, in_group_even) VALUES ("moreale", "Julie Moreale", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("moreau", "Karina Moreau", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("morizot", "Sébastien Morizot", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("moutadir", "Mohamed-Amine Moutadir", true);
INSERT INTO students (username, full_name, in_group_even) VALUES ("nicolardot", "Zoé Nicolardot", true);
INSERT INTO students (username, full_name, in_group_even) VALUES ("parize", "Germain Parize", true);
INSERT INTO students (username, full_name, in_group_even) VALUES ("rabut", "Josselin Rabut", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("revol", "Camille Revol", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("samba", "Romain Samba", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("martin-murillo", "Isabel Martin Murillo", false);
INSERT INTO students (username, full_name, in_group_even) VALUES ("shi", "Jianlong Shi", true);
INSERT INTO students (username, full_name, in_group_even) VALUES ("vetu", "Emile Vetu", true);

INSERT INTO units (name, exercise_count, deadline_group_even, deadline_group_odd) VALUES ("Loi du moment cinétique, solide en rotation autour d'un axe fixe", 10, "2021-03-12", "2021-03-19");
INSERT INTO units (name, exercise_count, deadline_group_even, deadline_group_odd) VALUES ("Structures cristallines", 10, "2021-03-12", "2021-03-19");
INSERT INTO units (name, exercise_count, deadline_group_even, deadline_group_odd) VALUES ("Mouvement dans un champ de force centrale conservatif", 10, "2021-03-26", "2021-03-19");
INSERT INTO units (name, exercise_count, deadline_group_even, deadline_group_odd) VALUES ("Réactions d'oxydoréduction", 8, "2021-03-26", "2021-04-02");
INSERT INTO units (name, exercise_count, deadline_group_even, deadline_group_odd) VALUES ("Les réactions acide base", 8, "2021-04-09", "2021-04-02");
INSERT INTO units (name, exercise_count, deadline_group_even, deadline_group_odd) VALUES ("Température, pression", 10, "2021-04-09", "2021-04-02");
INSERT INTO units (name, exercise_count, deadline_group_even, deadline_group_odd) VALUES ("Premier principe", 10, "2021-04-09", "2021-04-30");
INSERT INTO units (name, exercise_count, deadline_group_even, deadline_group_odd) VALUES ("Réactions de précipitation", 9, "2021-05-07", "2021-04-30");
INSERT INTO units (name, exercise_count, deadline_group_even, deadline_group_odd) VALUES ("Second principe", 10, "2021-05-07", "2021-05-21");
INSERT INTO units (name, exercise_count, deadline_group_even, deadline_group_odd) VALUES ("Diagrammes potentiel-pH", 4, "2021-05-28", "2021-05-21");
INSERT INTO units (name, exercise_count, deadline_group_even, deadline_group_odd) VALUES ("Thermodynamique des changements d’états", 7, "2021-05-28", "2021-06-04");
INSERT INTO units (name, exercise_count, deadline_group_even, deadline_group_odd) VALUES ("Machines thermiques", 10, "2021-05-28", "2021-06-04");
INSERT INTO units (name, exercise_count, deadline_group_even, deadline_group_odd) VALUES ("Diagrammes thermodynamiques", 2, "2021-05-28", "2021-06-04");
