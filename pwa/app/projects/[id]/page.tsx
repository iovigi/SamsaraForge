'use client';

import { useState, useEffect, use } from 'react';
import { authenticatedFetch } from '../../../utils/api';
import ProjectBoard from '../../../components/ProjectBoard';
import ProjectModal from '../../../components/ProjectModal';
import Link from 'next/link';

import { useLanguage } from '../../../context/LanguageContext';

export default function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { t } = useLanguage();
    const { id } = use(params);
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const fetchProject = async () => {
        try {
            const res = await authenticatedFetch(`/api/projects/${id}`);
            if (res.ok) {
                const data = await res.json();
                setProject(data.project);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProject();
    }, [id]);

    const handleProjectSave = async (updatedProject: any) => {
        try {
            const res = await authenticatedFetch(`/api/projects/${updatedProject._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedProject)
            });

            if (res.ok) {
                setIsEditModalOpen(false);
                window.location.reload(); // Refresh the whole page as requested
            } else {
                alert('Failed to update project');
            }
        } catch (error) {
            console.error(error);
            alert('Error updating project');
        }
    };

    if (loading) return <div className="p-5 text-center">{t('projects.loading')}</div>;
    if (!project) return <div className="p-5 text-center">{t('projects.notFound')}</div>;

    return (
        <div className="content-wrapper d-flex flex-column h-100">
            {/* Project Header - Slightly reduced padding as we have controls in board now */}
            <div className="project-header px-3 py-2 bg-white border-bottom shadow-sm d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                    <Link href="/projects" className="text-muted small mr-3">
                        <i className="fas fa-arrow-left"></i> {t('projects.back')}
                    </Link>
                    <h5 className="mb-0 font-weight-bold text-truncate" style={{ maxWidth: '60vw' }}>{project.name}</h5>
                </div>
            </div>

            {/* Kanban Board Area */}
            <div className="flex-grow-1 overflow-hidden" style={{
                backgroundImage: project.backgroundUrl
                    ? `url(${project.backgroundUrl.startsWith('http') ? project.backgroundUrl : `http://localhost:5000${project.backgroundUrl}`})`
                    : 'none',
                backgroundColor: '#f3f4f6',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                position: 'relative'
            }}>
                <ProjectBoard
                    project={project}
                    onEditProject={() => setIsEditModalOpen(true)}
                />
            </div>

            {/* Edit Project Modal */}
            {isEditModalOpen && (
                <ProjectModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    project={project}
                    onSave={handleProjectSave}
                />
            )}
        </div>
    );
}
