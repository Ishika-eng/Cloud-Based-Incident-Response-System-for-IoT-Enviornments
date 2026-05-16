import React from 'react';
import { TextBadge } from '../ui/Badge';
import { SEVERITY_COLORS } from '../../constants/severity';

const SeverityLabel = ({ severity, className }) => {
    return <TextBadge text={severity} color={SEVERITY_COLORS[severity]} className={className} />;
};

export default SeverityLabel;
