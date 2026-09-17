import { FastifyReply, FastifyRequest } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';

export class ConstraintsController {
    private constraintsPath = path.join(process.cwd(), 'constraints.txt');

    async getConstraints(request: FastifyRequest, reply: FastifyReply) {
        try {
            if (fs.existsSync(this.constraintsPath)) {
                const content = fs.readFileSync(this.constraintsPath, 'utf-8');
                return reply.code(200).send({ content });
            }
            return reply.code(200).send({ content: '' });
        } catch (error: any) {
            return reply.code(500).send({ message: 'Failed to read constraints file' });
        }
    }

    async saveConstraints(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { content } = request.body as { content: string };

            // Create file if it doesn't exist (writeFileSync does this)
            fs.writeFileSync(this.constraintsPath, content || '');

            return reply.code(200).send({ success: true, message: 'Constraints saved successfully' });
        } catch (error: any) {
            console.error('Save constraints error:', error);
            return reply.code(500).send({ message: 'Failed to save constraints file' });
        }
    }
}
