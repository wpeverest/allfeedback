import { Navigate, useParams } from '@tanstack/react-router';

const FormAnalytics = () => {
	// The unified Analytics dashboard is now located at /analytics/
	// If a user navigates to a specific form's analytics via a legacy link,
	// we simply redirect them to the unified dashboard.
	
	return <Navigate to="/analytics/" replace />;
};

export default FormAnalytics;
