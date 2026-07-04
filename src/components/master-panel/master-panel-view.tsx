"use client";

import { useState } from "react";

type View = "list" | "add";

export default function MasterPanelView() {
  const [view, setView] = useState<View>("list");

  if (view === "add") {
    return (
      <div className="space-y-5 p-4 bg-white rounded-md shadow">
        <h2 className="text-xl font-bold">Add New Employee</h2>
        <p className="text-gray-500">Employee entry form coming soon...</p>
        <button
        onClick={() => setView("list")}
        className="mt-4 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
        >
          Cancel
          </button>
          </div>
          );
        }

        return (
          <div className="space-y-5 p-4">
            <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Master Panel</h1>
            <button
            onClick={() => setView("add")}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              + Add New Employee
              </button>
              </div>

              <div className="bg-white p-6 rounded-md shadow text-center text-gray-500">
              No employees found in the list. Click "+ Add New Employee" to get started.
              </div>
              </div>
              );
            }        