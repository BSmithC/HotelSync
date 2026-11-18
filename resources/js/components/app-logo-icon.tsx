import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M17.006 19.241a8 8 0 0 1-10.011 0" />
            <path d="M19.919 14.143a8 8 0 0 0-4.971-8.583" />
            <path d="M4.081 14.143A8 8 0 0 1 9.052 5.56" />
            <circle cx="12" cy="5.001" r="3" />
            <circle cx="19" cy="17" r="3" />
            <circle cx="5" cy="17" r="3" />
        </svg>
    );
}
