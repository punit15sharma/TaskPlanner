                            {/* Add Task Form */}
                            <div>
                                <input
                                    type="text"
                                    value={newTask.name}
                                    onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                                    onKeyPress={(e) => e.key === 'Enter' && addTask()}
                                    placeholder="What needs to be done?"
                                    className="input"
                                />
                                <div>
                                    <div className="grid">
                                        {['Importance', 'Length', 'Difficulty'].map(type => (
                                            <div key={type} className="slider-container">
                                                <label className="block text-sm font-medium">
                                                    {type}: {newTask[type.toLowerCase()]}
                                                </label>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="5"
                                                    value={newTask[type.toLowerCase()]}
                                                    onChange={(e) => setNewTask({
                                                        ...newTask,
                                                        [type.toLowerCase()]: parseInt(e.target.value)
                                                    })}
                                                    className="slider"
                                                    style={{ '--slider-value': `${(newTask[type.toLowerCase()] - 1) * 25}%` }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 mt-4">  {/* Same grid as sliders */}
                                        <div className="slider-container">
                                            <label className="block text-sm font-medium text-center mb-2">
                                                Project
                                            </label>
                                            <select
                                                value={newTask.project || 'other'}
                                                onChange={(e) => setNewTask({
                                                    ...newTask,
                                                    project: e.target.value
                                                })}
                                                className="input text-center w-full"
                                            >
                                                {Object.keys(PROJECTS).map(projectId => (
                                                    <option key={projectId} value={projectId}>
                                                    {PROJECTS[projectId].name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="slider-container">  {/* Center column */}
                                            <label className="block text-sm font-medium text-center mb-2">
                                                Deadline (optional)
                                            </label>
                                            <input
                                                type="date"
                                                value={newTask.deadline || ''}
                                                onChange={(e) => setNewTask({
                                                    ...newTask,
                                                    deadline: e.target.value || null
                                                })}
                                                className="input text-center"
                                            />
                                        </div>
                                        <div></div>  {/* Empty right column */}
                                    </div>
                                </div>
                                <button
                                    onClick={addTask}
                                    className="add-task-button"
                                >
                                    <svg viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
                                    </svg>
                                    Add Task
                                </button>
                            </div>