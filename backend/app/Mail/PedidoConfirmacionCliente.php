<?php

namespace App\Mail;

use App\Models\Pedido;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PedidoConfirmacionCliente extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Pedido $pedido)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Confirmación de tu pedido ' . $this->pedido->numero . ' — Praga Medellín',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mails.confirmacion_cliente',
            with: [
                'pedido' => $this->pedido,
                'cliente' => $this->pedido->cliente,
            ],
        );
    }
}