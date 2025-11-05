import Event from "../models/Event.js";

export async function createEvent(req, res) {
  const { title, startTime, endTime } = req.body;
  const event = await Event.create({
    title,
    startTime,
    endTime,
    owner: req.user._id,
  });
  
  //socket for new SWAPPABLE event
  const io = req.app.get("io");
  if (io && event.status === "SWAPPABLE") {
    io.emit("new-swappable-slot", {
      event: event,
      message: "New swappable slot available",
    });
  }
  
  res.json(event);
}

export async function getMyEvents(req, res) {
  const events = await Event.find({ owner: req.user._id }).sort({
    startTime: 1,
  });
  res.json(events);
}

export async function updateEvent(req, res) {
  const { id } = req.params;
  const body = req.body;
  const oldEvent = await Event.findOne({ _id: id, owner: req.user._id });
  if (!oldEvent) return res.status(404).json({ message: "Event not found" });
  
  const event = await Event.findOneAndUpdate(
    { _id: id, owner: req.user._id },
    body,
    { new: true }
  );
  
  // Socket for status changes
  const io = req.app.get("io");
  if (io) {
    // notify user if status is swappable
    if (body.status === "SWAPPABLE" && oldEvent.status !== "SWAPPABLE") {
      io.emit("new-swappable-slot", {
        event: event,
        message: "New swappable slot available",
      });
    }
    // notify user if status is not swappable
    if (oldEvent.status === "SWAPPABLE" && body.status !== "SWAPPABLE") {
      io.emit("slot-no-longer-swappable", {
        eventId: event._id,
        message: "A slot is no longer swappable",
      });
    }
  }
  
  res.json(event);
}

export async function deleteEvent(req, res) {
  const { id } = req.params;
  const event = await Event.findOneAndDelete({ _id: id, owner: req.user._id });
  if (!event) return res.status(404).json({ message: "Event not found" });
  
  //socket for deleted SWAPPABLE event
  const io = req.app.get("io");
  if (io && event.status === "SWAPPABLE") {
    io.emit("slot-no-longer-swappable", {
      eventId: id,
      message: "A slot is no longer swappable",
    });
  }
  
  res.json({ message: "Deleted" });
}
