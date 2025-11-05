describe("Swap response API", () => {
	function setupTwoUsersAndSlots() {
		const data = {};
		return cy
			.signup({ name: "Test1" })
			.then((a) => {
				data.a = a;
				return cy.signup({ name: "Test2" });
			})
			.then((b) => {
				data.b = b;
				return cy.createEvent(data.a.token, { title: "T1" });
			})
			.then((aEvent) => {
				data.aEvent = aEvent;
				return cy.createEvent(data.b.token, { title: "T1" });
			})
			.then((bEvent) => {
				data.bEvent = bEvent;
				return cy.setEventStatus(data.a.token, data.aEvent._id, "SWAPPABLE");
			})
			.then(() => cy.setEventStatus(data.b.token, data.bEvent._id, "SWAPPABLE"))
			.then(() => data);
	}

	it("accepting a swap should swap owners and mark events BUSY", () => {
		setupTwoUsersAndSlots().then((d) => {
			cy.createSwap(d.a.token, { mySlotId: d.aEvent._id, theirSlotId: d.bEvent._id }).then((swap) => {
				cy.respondSwap(d.b.token, swap._id, true).then((res) => {
					expect(res.status).to.eq(200);
					expect(res.body.status).to.eq("ACCEPTED");

					cy.getMyEvents(d.a.token).then((aEvents) => {
						const a1 = aEvents.find((e) => e._id === d.aEvent._id);
						expect(a1).to.be.undefined;
					});
					cy.getMyEvents(d.b.token).then((bEvents) => {
						const b1 = bEvents.find((e) => e._id === d.bEvent._id);
						expect(b1).to.be.undefined;
					});

					expect(res.body.mySlot.status).to.eq("BUSY");
					expect(res.body.theirSlot.status).to.eq("BUSY");
				});
			});
		});
	});

	it("rejecting a swap should keep owners and keep SWAPPABLE", () => {
		setupTwoUsersAndSlots().then((d) => {
			cy.createSwap(d.a.token, { mySlotId: d.aEvent._id, theirSlotId: d.bEvent._id }).then((swap) => {
				cy.respondSwap(d.b.token, swap._id, false).then((res) => {
					expect(res.status).to.eq(200);
					expect(res.body.status).to.eq("REJECTED");
					expect(res.body.mySlot.status).to.eq("SWAPPABLE");
					expect(res.body.theirSlot.status).to.eq("SWAPPABLE");

					cy.getMyEvents(d.a.token).then((aEvents) => {
						expect(aEvents.some((e) => e._id === d.aEvent._id)).to.eq(true);
					});
					cy.getMyEvents(d.b.token).then((bEvents) => {
						expect(bEvents.some((e) => e._id === d.bEvent._id)).to.eq(true);
					});
				});
			});
		});
	});

	it("responding accept when a slot is no longer SWAPPABLE should 400 and mark request REJECTED", () => {
		setupTwoUsersAndSlots().then((d) => {
			cy.createSwap(d.a.token, { mySlotId: d.aEvent._id, theirSlotId: d.bEvent._id }).then((swap) => {

				cy.setEventStatus(d.b.token, d.bEvent._id, "BUSY").then(() => {
					cy.respondSwap(d.b.token, swap._id, true).then((res) => {
						expect(res.status).to.eq(400);
						expect(res.body.message).to.match(/no longer available|no longer/iu);

						cy.getIncomingRequests(d.b.token).then((incoming) => {
							const updated = incoming.find((r) => r._id === swap._id);
							expect(updated.status).to.eq("REJECTED");
						});
					});
				});
			});
		});
	});
});

