const Notification = require("../models/notification.js");
const Task = require("../models/task.js");
const User = require("../models/user.js");

const createTask = async (req, res) => {
  try {
    const { userId } = req.user;
    const { title, date, priority, stage, team, assets } = req.body;

    let text = "New task has been assigned to you";
    if (team?.length > 1) {
      text = text + ` and ${team?.length - 1} others.`;
    }
    text =
      text +
      ` The task priority is set a ${priority} priority, so check and act accordingly. The task date is ${new Date(
        date
      ).toDateString()}. Thank you!!!`;

    const activity = {
      type: "assigned",
      activity: text,
      by: userId,
    };

    // Task creation
    const task = await Task.create({
      title,
      team,
      stage: stage.toLowerCase(),
      date,
      priority: priority.toLowerCase(),
      assets,
      activities: activity,
    });

    // Notification creation
    await Notification.create({
      team,
      text,
      task: task._id,
    });

    // Update user tasks
    const updateResult = await User.updateMany(
      { _id: { $in: team } },
      { $push: { tasks: task._id } }
    );

    res
      .status(200)
      .json({ status: true, task, message: "Task created successfully." });
  } catch (error) {
    console.error("Error in createTask:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};
const duplicateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);
    const newTask = await Task.create({
      ...task,
      title: task.title + " - Duplicate",
    });
    newTask.team = task.team;
    newTask.subTasks = task.subTasks;
    newTask.assets = task.assets;
    newTask.priority = task.priority;
    newTask.stage = task.stage;

    await newTask.save();
    let text = "New task has been assigned to you";
    if (task.team.length > 1) {
      text = text + ` and ${task.team.length - 1} others.`;
    }
    text =
      text +
      ` The task priority is set a ${
        task.priority
      } priority, so check and act accordingly. The task date is ${task.date.toDateString()}. Thank you!!!`;
    await Notification.create({ team: task.team, text, task: newTask._id });
    res
      .status(200)
      .json({ status: true, message: "Task duplicated successfully." });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message });
  }
};
const postTaskActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { type, activity } = req.body;
    const task = await Task.findById(id);

    const data = {
      type,
      activity,
      by: userId,
    };
    task.activities.push(data);
    await task.save();
    res
      .status(200)
      .json({ status: true, message: "Activity posted successfully." });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};
const dashboardStatistics = async (req, res) => {
  try {
    const { userId, isAdmin } = req.user;
    const allTasks = isAdmin
      ? await Task.find({
          isTrashed: false,
        })
          .populate({
            path: "team",
            select: "name role title email",
          })
          .sort({ _id: -1 })
      : await Task.find({
          isTrashed: false,
          team: { $all: [userId] },
        })
          .populate({
            path: "team",
            select: "name role title email",
          })
          .sort({ _id: -1 });
    const allUsers = await User.find({ isActive: true })
      .select("name title role isAdmin isActive createdAt")
      .limit(10)
      .sort({ _id: -1 });

    const teamMembersSet = new Set();

    allTasks.forEach((task) => {
      task.team.forEach((member) => {
        teamMembersSet.add(member._id);
      });
    });
    const teamMembersArray = Array.from(teamMembersSet);
    const teamMembers = await User.find({
      _id: { $in: teamMembersArray },
    }).select("name title role isAdmin isActive createdAt");

    //   group task by stage and calculate counts
    const groupTasks = allTasks.reduce((result, task) => {
      const stage = task.stage;
      result[stage] = (result[stage] || 0) + 1;
      return result;
    }, {});

    // Group tasks by priority
    const groupData = Object.entries(
      allTasks.reduce((result, task) => {
        const { priority } = task;
        result[priority] = (result[priority] || 0) + 1;
        return result;
      }, {})
    ).map(([name, total]) => ({ name, total }));

    // calculate total tasks
    const totalTasks = allTasks?.length;
    const last10Task = allTasks?.slice(0, 10);

    const summary = {
      totalTasks,
      last10Task,
      users: isAdmin ? allUsers : teamMembers,
      tasks: groupTasks,
      graphData: groupData,
    };

    res.status(200).json({
      status: true,
      message: "Successfully",
      ...summary,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};
const getTasks = async (req, res) => {
  try {
    const { stage, isTrashed } = req.query;
    const { userId, isAdmin } = req.user;
    let query = { isTrashed: isTrashed ? true : false };
    if (stage) {
      query.stage = stage;
    }
    if (!isAdmin) {
      query.team = { $all: [userId] };
    }
    let queryResult = await Task.find(query)
      .populate({ path: "team", select: "name title email" })
      .sort({ _id: -1 });
    res.status(200).json({
      status: true,
      tasks: queryResult,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message });
  }
};
const getTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id)
      .populate({ path: "team", select: "name title role email" })
      .populate({
        path: "activities.by",
        select: "name",
      });
    res.status(200).json({
      status: true,
      task,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};
const createSubTask = async (req, res) => {
  try {
    const { title, tag, date } = req.body;
    const { id } = req.params;
    const newSubTask = {
      title,
      date,
      tag,
    };
    const task = await Task.findById(id);
    task.subTasks.push(newSubTask);
    await task.save();
    res
      .status(200)
      .json({ status: true, message: "SubTask added successfully." });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, team, stage, priority, assets } = req.body;
    const task = await Task.findById(id);

    task.title = title;
    task.date = date;
    task.priority = priority.toLowerCase();
    task.assets = assets;
    task.stage = stage.toLowerCase();
    task.team = team;

    await task.save();
    res
      .status(200)
      .json({ status: true, message: "Task duplicated successfully." });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};
const trashTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);

    task.isTrashed = true;

    await task.save();

    res.status(200).json({
      status: true,
      message: `Task trashed successfully.`,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};
const deleteRestoreTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { actionType } = req.query;

    if (actionType === "delete") {
      await Task.findByIdAndDelete(id);
    } else if (actionType === "deleteAll") {
      await Task.deleteMany({ isTrashed: true });
    } else if (actionType === "restore") {
      const task = await Task.findById(id);
      task.isTrashed = false;
      task.save();
    } else if (actionType === "restoreAll") {
      await Task.updateMany(
        { isTrashed: true },
        { $set: { isTrashed: false } }
      );
    }
    res.status(200).json({
      status: true,
      message: `Operation performed successfully.`,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

module.exports = {
  createTask,
  duplicateTask,
  postTaskActivity,
  dashboardStatistics,
  getTasks,
  getTask,
  createSubTask,
  updateTask,
  trashTask,
  deleteRestoreTask,
};
