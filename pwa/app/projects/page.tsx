'use client';

import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';
import ProjectCard from '../../components/ProjectCard';
import ProjectModal from '../../components/ProjectModal';
import { triggerProjectsUpdate } from '../../utils/events';

import { useLanguage } from '../../context/LanguageContext';

export default function ProjectsPage() {
    const { t } = useLanguage();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const res = await authenticatedFetch('/api/projects');
            if (res.ok) {
                const data = await res.json();
                setProjects(data.projects);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleSave = async (project: any) => {
        try {
            let res;
            if (project._id) {
                res = await authenticatedFetch(`/api/projects/${project._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(project)
                });
            } else {
                res = await authenticatedFetch('/api/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(project)
                });
            }

            if (res.ok) {
                setIsModalOpen(false);
                fetchProjects();
                triggerProjectsUpdate();
            }
        } catch (error) {
            console.error(error);
            alert('Failed to save project');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('projects.deleteConfirm'))) return;
        try {
            await authenticatedFetch(`/api/projects/${id}`, { method: 'DELETE' });
            setProjects(prev => prev.filter((p: any) => p._id !== id));
            triggerProjectsUpdate();
        } catch (error) {
            console.error(error);
        }
    };

    const openCreate = () => {
        setEditingProject(null);
        setIsModalOpen(true);
    };

    const openEdit = (project: any) => {
        setEditingProject(project);
        setIsModalOpen(true);
    };

    return (
        <div className="content-wrapper">
            <section className="content-header">
                <div className="container-fluid">
                </div>
            </section>

            <div className="container-fluid p-3">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="mb-0 font-weight-bold text-dark">{t('projects.title')}</h2>
                    <button className="btn btn-primary shadow-sm" onClick={openCreate}>
                        <i className="fas fa-plus mr-2"></i> {t('projects.new')}
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="sr-only">{t('projects.loading')}</span>
                        </div>
                    </div>
                ) : (
                    <div className="row">
                        {projects.length === 0 ? (
                            <div className="col-12 text-center py-5 text-muted">
                                <i className="fas fa-folder-open fa-3x mb-3 opacity-50"></i>
                                <p>{t('projects.empty')}</p>
                            </div>
                        ) : (
                            projects.map((project: any) => (
                                <div key={project._id} className="col-12 col-md-6 col-lg-4 col-xl-3 mb-4">
                                    <ProjectCard
                                        project={project}
                                        onEdit={(e) => { e.stopPropagation(); openEdit(project); }}
                                        onDelete={(e) => { e.stopPropagation(); handleDelete(project._id); }}
                                    />
                                </div>
                            ))
                        )}
                    </div>
                )}

                {isModalOpen && (
                    <ProjectModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        project={editingProject}
                        onSave={handleSave}
                    />
                )}
            </div>
        </div>
    );
}
