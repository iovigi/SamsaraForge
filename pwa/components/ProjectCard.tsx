import Link from 'next/link';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../utils/config';

interface ProjectCardProps {
    project: any;
    onEdit: (e: any) => void;
    onDelete: (e: any) => void;
}

export default function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
    const { t } = useLanguage();

    // Fix image URL to include localhost:5000 if not standard http
    const getImageUrl = (url: string) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        // Check if there is already a slash
        const path = url.startsWith('/') ? url : `/${url}`;
        return `${API_BASE_URL}${path}`;
    };

    const imageUrl = getImageUrl(project.backgroundUrl);

    return (
        <div className="project-card h-100 shadow-sm position-relative">
            <Link href={`/projects/view?id=${project._id}`} className="text-decoration-none h-100 d-block">
                <div className="project-card-img-wrapper">
                    {imageUrl ? (
                        <img src={imageUrl} alt={project.name} className="project-card-img" />
                    ) : (
                        <div style={{ height: '100%', width: '100%', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }}></div>
                    )}

                    <div className="project-overlay">
                        <h5 className="project-title text-truncate">{project.name}</h5>
                        {project.startDate && (
                            <div className="project-subtitle">
                                <i className="far fa-calendar-alt mr-2"></i>
                                {new Date(project.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="project-card-body">
                    <p className="card-text text-muted small mb-0" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        height: '4.2em', // Fixed height for alignment
                        lineHeight: '1.4em'
                    }}>
                        {project.description || <span className="text-muted font-italic">{t('projects.noDescription') || 'No description provided.'}</span>}
                    </p>

                    <div className="mt-3 pt-3 border-top d-flex justify-content-between align-items-center">
                        <span className="badge badge-light p-2 border">
                            {t('common.active')}
                        </span>
                        <small className="text-primary font-weight-bold">
                            {t('projects.viewBoard')} <i className="fas fa-arrow-right ml-1"></i>
                        </small>
                    </div>
                </div>
            </Link>

            {/* Actions positioned absolutely on top, OUTSIDE the Link */}
            <div className="project-actions" style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 20 }}>
                <button
                    className="btn btn-light btn-sm rounded-circle shadow-sm mr-2"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onEdit(e);
                    }}
                    title={t('common.edit')}
                >
                    <i className="fas fa-pencil-alt text-primary"></i>
                </button>
                <button
                    className="btn btn-danger btn-sm rounded-circle shadow-sm"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete(e);
                    }}
                    title={t('common.delete')}
                >
                    <i className="fas fa-trash"></i>
                </button>
            </div>
        </div>
    );
}
