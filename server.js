const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

function readData(filename) {
    return JSON.parse(fs.readFileSync(`data/${filename}`));
}

function writeData(filename, data) {
    fs.writeFileSync(`data/${filename}`, JSON.stringify(data, null, 2));
}

app.get('/api/students', (req, res) => {
    res.json(readData('students.json'));
});

app.post('/api/students', (req, res) => {
    const students = readData('students.json');
    const newStudent = { id: Date.now(), ...req.body };
    students.push(newStudent);
    writeData('students.json', students);
    res.json(newStudent);
});

app.get('/api/courses', (req, res) => {
    res.json(readData('courses.json'));
});

app.get('/api/attendance', (req, res) => {
    res.json(readData('attendance.json'));
});

app.post('/api/attendance', (req, res) => {
    const attendance = readData('attendance.json');
    const newRecord = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        ...req.body
    };
    attendance.push(newRecord);
    writeData('attendance.json', attendance);
    res.json(newRecord);
});

app.get('/api/reports/student/:id', (req, res) => {
    const studentId = parseInt(req.params.id);
    const attendance = readData('attendance.json');
    const students = readData('students.json');
    const courses = readData('courses.json');

    const student = students.find(s => s.id === studentId);
    if (!student) return res.status(404).send('Student not found');

    const studentAttendance = attendance.filter(a => a.studentId === studentId);

    const report = {
        student: student.name,
        group: student.group,
        courses: {}
    };

    studentAttendance.forEach(record => {
        const course = courses.find(c => c.id === record.courseId);
        if (!course) return;

        if (!report.courses[course.name]) {
            report.courses[course.name] = {
                present: 0,
                absent: 0,
                dates: []
            };
        }

        if (record.status === 'present') {
            report.courses[course.name].present++;
        } else {
            report.courses[course.name].absent++;
        }

        report.courses[course.name].dates.push({
            date: record.date,
            status: record.status
        });
    });

    res.setHeader('Content-disposition', 'attachment; filename=student_report.json');
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(report, null, 2));
});

app.delete('/api/students/:id', (req, res) => {
    const students = readData('students.json');
    const id = parseInt(req.params.id);

    const updatedStudents = students.filter(student => student.id !== id);

    if (updatedStudents.length === students.length) {
        return res.status(404).send('Student not found');
    }

    writeData('students.json', updatedStudents);

    const attendance = readData('attendance.json');
    const updatedAttendance = attendance.filter(record => record.studentId !== id);
    writeData('attendance.json', updatedAttendance);

    res.send({ success: true });
});

app.get('/api/courses/:id', (req, res) => {
    const courses = readData('courses.json');
    const course = courses.find(c => c.id === parseInt(req.params.id));
    if (!course) return res.status(404).send('Course not found');
    res.json(course);
});

app.post('/api/courses', (req, res) => {
    const courses = readData('courses.json');
    const newCourse = {
        id: Date.now(),
        name: req.body.name,
        teacher: req.body.teacher,
        schedule: req.body.schedule
    };
    courses.push(newCourse);
    writeData('courses.json', courses);
    res.json(newCourse);
});

app.put('/api/courses/:id', (req, res) => {
    const courses = readData('courses.json');
    const index = courses.findIndex(c => c.id === parseInt(req.params.id));

    if (index === -1) return res.status(404).send('Course not found');

    courses[index] = {
        ...courses[index],
        ...req.body
    };

    writeData('courses.json', courses);
    res.json(courses[index]);
});

app.delete('/api/courses/:id', (req, res) => {
    const courses = readData('courses.json');
    const id = parseInt(req.params.id);

    const updatedCourses = courses.filter(course => course.id !== id);

    if (updatedCourses.length === courses.length) {
        return res.status(404).send('Course not found');
    }

    writeData('courses.json', updatedCourses);

    const attendance = readData('attendance.json');
    const updatedAttendance = attendance.filter(record => record.courseId !== id);
    writeData('attendance.json', updatedAttendance);

    res.send({ success: true });
});

app.get('/api/reports/course/:id', (req, res) => {
    const courseId = parseInt(req.params.id);
    const attendance = readData('attendance.json');
    const students = readData('students.json');
    const courses = readData('courses.json');

    const course = courses.find(c => c.id === courseId);
    if (!course) return res.status(404).send('Course not found');

    const courseAttendance = attendance.filter(a => a.courseId === courseId);

    const report = {
        course: course.name,
        teacher: course.teacher,
        students: {}
    };

    courseAttendance.forEach(record => {
        const student = students.find(s => s.id === record.studentId);
        if (!student) return;

        const studentKey = `${student.name} (${student.group})`;

        if (!report.students[studentKey]) {
            report.students[studentKey] = {
                present: 0,
                absent: 0,
                dates: []
            };
        }

        if (record.status === 'present') {
            report.students[studentKey].present++;
        } else {
            report.students[studentKey].absent++;
        }

        report.students[studentKey].dates.push({
            date: record.date,
            status: record.status
        });
    });

    res.setHeader('Content-disposition', 'attachment; filename=course_report.json');
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(report, null, 2));
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});