import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

type Props = {
    title?: string;
    description?: string;
};

export default function ComingSoon({
    title = 'Módulo en construcción',
    description = 'Este módulo estará disponible en una próxima entrega.',
}: Props) {
    return (
        <>
            <Head title={title} />

            <div className="flex flex-1 items-center justify-center p-6">
                <Card className="w-full max-w-lg">
                    <CardHeader className="items-center text-center">
                        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            <Construction className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Button variant="outline" asChild>
                            <Link href="/dashboard">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Volver al dashboard
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
