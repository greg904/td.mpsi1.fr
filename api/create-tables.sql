CREATE TABLE students (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    group_a BOOLEAN NOT NULL
);

CREATE TABLE units (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    exercise_count INTEGER NOT NULL,
    -- For each group, the date when the students have to present their
    -- exercises.
    deadline_a TEXT NOT NULL,
    deadline_b TEXT NOT NULL
);

CREATE TABLE exercise_teacher_override (
    unit_id INTEGER NOT NULL,
    index_ INTEGER NOT NULL,
    -- For whatever reason, the teacher said that students should not do this
    -- exercise.
    blocked BOOLEAN NOT NULL DEFAULT FALSE,
    -- Corrected by the teacher for group A
    corrected_a BOOLEAN NOT NULL DEFAULT FALSE,
    -- Corrected by the teacher for group B
    corrected_b BOOLEAN NOT NULL DEFAULT FALSE,
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

INSERT INTO students (username, full_name, group_a) VALUES ("antoine", "Cybélia Antoine", false);
INSERT INTO students (username, full_name, group_a) VALUES ("audoin", "Anatol Audoin", false);
INSERT INTO students (username, full_name, group_a) VALUES ("yadrin", "Alexei Yadrin", false);
INSERT INTO students (username, full_name, group_a) VALUES ("baril", "Eloïse Baril", true);
INSERT INTO students (username, full_name, group_a) VALUES ("barrier", "Robin Barrier", true);
INSERT INTO students (username, full_name, group_a) VALUES ("baulard", "Nathan Baulard", true);
INSERT INTO students (username, full_name, group_a) VALUES ("beer-boussoukaia", "Matteo Beer Boussoukaia", false);
INSERT INTO students (username, full_name, group_a) VALUES ("berger", "Timothé Berger", false);
INSERT INTO students (username, full_name, group_a) VALUES ("cartaux", "Eve Cartaux", false);
INSERT INTO students (username, full_name, group_a) VALUES ("clinard", "Rémi Clinard", true);
INSERT INTO students (username, full_name, group_a) VALUES ("cossart", "Mathis Cossart", true);
INSERT INTO students (username, full_name, group_a) VALUES ("depoire-ferrer", "Greg Depoire--Ferrer", true);
INSERT INTO students (username, full_name, group_a) VALUES ("dherissart", "Andréa Dherissart", false);
INSERT INTO students (username, full_name, group_a) VALUES ("dromard", "Baptiste Dromard", false);
INSERT INTO students (username, full_name, group_a) VALUES ("fracchia", "Jonah Fracchia", false);
INSERT INTO students (username, full_name, group_a) VALUES ("genot", "Clément Genot", true);
INSERT INTO students (username, full_name, group_a) VALUES ("ghellab", "Hamza Ghellab", true);
INSERT INTO students (username, full_name, group_a) VALUES ("girard", "Enzo Girard", true);
INSERT INTO students (username, full_name, group_a) VALUES ("girardot", "Léa Girardot", false);
INSERT INTO students (username, full_name, group_a) VALUES ("guyot", "Alice Guyot", false);
INSERT INTO students (username, full_name, group_a) VALUES ("hemon", "Tristan Hemon", false);
INSERT INTO students (username, full_name, group_a) VALUES ("houze", "Hugo Houze", true);
INSERT INTO students (username, full_name, group_a) VALUES ("jeunehomme-leger", "Etienne Jeunehomme-Leger", true);
INSERT INTO students (username, full_name, group_a) VALUES ("joseph", "Axelle Joseph", true);
INSERT INTO students (username, full_name, group_a) VALUES ("kellal", "Ramy Kellal", false);
INSERT INTO students (username, full_name, group_a) VALUES ("krasnicki", "Sarah Krasnicki", false);
INSERT INTO students (username, full_name, group_a) VALUES ("lechere", "Hugo Lechere", false);
INSERT INTO students (username, full_name, group_a) VALUES ("linel", "Marina Linel", true);
INSERT INTO students (username, full_name, group_a) VALUES ("loones", "Victor Loones", true);
INSERT INTO students (username, full_name, group_a) VALUES ("lucyszyn", "Edward Lucyszyn", true);
INSERT INTO students (username, full_name, group_a) VALUES ("martin", "Lucas Martin", false);
INSERT INTO students (username, full_name, group_a) VALUES ("massot", "May Massot", false);
INSERT INTO students (username, full_name, group_a) VALUES ("menin", "Amélie Menin", false);
INSERT INTO students (username, full_name, group_a) VALUES ("merzouk", "Ayman Merzouk", true);
INSERT INTO students (username, full_name, group_a) VALUES ("meyer", "Thomas Meyer", true);
INSERT INTO students (username, full_name, group_a) VALUES ("mina-passi", "Hugo Mina Passi", true);
INSERT INTO students (username, full_name, group_a) VALUES ("moreale", "Julie Moreale", false);
INSERT INTO students (username, full_name, group_a) VALUES ("moreau", "Karina Moreau", false);
INSERT INTO students (username, full_name, group_a) VALUES ("morizot", "Sébastien Morizot", false);
INSERT INTO students (username, full_name, group_a) VALUES ("moutadir", "Mohamed-Amine Moutadir", true);
INSERT INTO students (username, full_name, group_a) VALUES ("nicolardot", "Zoé Nicolardot", true);
INSERT INTO students (username, full_name, group_a) VALUES ("parize", "Germain Parize", true);
INSERT INTO students (username, full_name, group_a) VALUES ("rabut", "Josselin Rabut", false);
INSERT INTO students (username, full_name, group_a) VALUES ("revol", "Camille Revol", false);
INSERT INTO students (username, full_name, group_a) VALUES ("samba", "Romain Samba", false);
INSERT INTO students (username, full_name, group_a) VALUES ("martin-murillo", "Isabel Martin Murillo", false);
INSERT INTO students (username, full_name, group_a) VALUES ("shi", "Jianlong Shi", true);
INSERT INTO students (username, full_name, group_a) VALUES ("vetu", "Emile Vetu", true);

INSERT INTO units (name, exercise_count, deadline_a, deadline_b) VALUES ("Loi du moment cinétique, solide en rotation autour d'un axe fixe", 10, "2021-03-12", "2021-03-19");
INSERT INTO units (name, exercise_count, deadline_a, deadline_b) VALUES ("Structures cristallines", 10, "2021-03-12", "2021-03-19");
INSERT INTO units (name, exercise_count, deadline_a, deadline_b) VALUES ("Mouvement dans un champ de force centrale conservatif", 10, "2021-03-26", "2021-03-19");
INSERT INTO units (name, exercise_count, deadline_a, deadline_b) VALUES ("Réactions d'oxydoréduction", 8, "2021-03-26", "2021-04-02");
INSERT INTO units (name, exercise_count, deadline_a, deadline_b) VALUES ("Les réactions acide base", 8, "2021-04-09", "2021-04-02");
INSERT INTO units (name, exercise_count, deadline_a, deadline_b) VALUES ("Température, pression", 10, "2021-04-09", "2021-04-02");
INSERT INTO units (name, exercise_count, deadline_a, deadline_b) VALUES ("Premier principe", 10, "2021-04-09", "2021-04-30");
INSERT INTO units (name, exercise_count, deadline_a, deadline_b) VALUES ("Réactions de précipitation", 9, "2021-05-07", "2021-04-30");
INSERT INTO units (name, exercise_count, deadline_a, deadline_b) VALUES ("Second principe", 10, "2021-05-07", "2021-05-21");
INSERT INTO units (name, exercise_count, deadline_a, deadline_b) VALUES ("Diagrammes potentiel-pH", 4, "2021-05-28", "2021-05-21");
INSERT INTO units (name, exercise_count, deadline_a, deadline_b) VALUES ("Thermodynamique des changements d’états", 7, "2021-05-28", "2021-06-04");
INSERT INTO units (name, exercise_count, deadline_a, deadline_b) VALUES ("Machines thermiques", 10, "2021-05-28", "2021-06-04");
INSERT INTO units (name, exercise_count, deadline_a, deadline_b) VALUES ("Diagrammes thermodynamiques", 2, "2021-05-28", "2021-06-04");
