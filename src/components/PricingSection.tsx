import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, Zap, Crown, Rocket } from "lucide-react";

const plans = [
  {
    name: "Básico",
    price: "$4.99",
    period: "/mes",
    icon: Zap,
    description: "Acceso a transmisiones en vivo estándar",
    features: [
      "Streaming en HD",
      "Acceso a eventos grabados",
      "1 dispositivo simultáneo",
      "Chat en vivo",
    ],
    popular: false,
  },
  {
    name: "Premium",
    price: "$12.99",
    period: "/mes",
    icon: Crown,
    description: "La experiencia VR completa",
    features: [
      "Streaming en 4K + VR 360°",
      "Acceso anticipado a eventos",
      "3 dispositivos simultáneos",
      "Chat VIP + backstage virtual",
      "Sin anuncios",
    ],
    popular: true,
  },
  {
    name: "Ultra",
    price: "$24.99",
    period: "/mes",
    icon: Rocket,
    description: "Para los verdaderos fanáticos",
    features: [
      "Todo en Premium",
      "Meet & greet virtual con artistas",
      "Contenido exclusivo detrás de cámaras",
      "5 dispositivos simultáneos",
      "Descarga offline en VR",
      "Soporte prioritario 24/7",
    ],
    popular: false,
  },
];

const PricingSection = () => {
  return (
    <section id="precios" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
            Elige tu <span className="text-primary">plan</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Suscríbete y accede a conciertos en vivo, experiencias VR inmersivas y contenido exclusivo
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-20">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
            >
              <Card
                className={`relative h-full border transition-all duration-300 hover:scale-105 ${
                  plan.popular
                    ? "border-primary/60 bg-primary/5 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.3)]"
                    : "border-border/40 bg-card/60 backdrop-blur-sm hover:border-primary/30"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-display font-semibold px-4 py-1 rounded-full">
                    Más Popular
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <plan.icon className={`w-8 h-8 mx-auto mb-3 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                  <CardTitle className="font-display text-xl text-foreground">{plan.name}</CardTitle>
                  <CardDescription className="text-muted-foreground">{plan.description}</CardDescription>
                  <div className="pt-4">
                    <span className="font-display text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={plan.popular ? "hero" : "heroOutline"}
                    className="w-full"
                  >
                    Suscribirme
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Payment Methods */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground mb-3">
            Métodos de Pago
          </h3>
          <p className="text-muted-foreground mb-8">
            Elige cómo quieres pagar tu suscripción
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
            <Button
              variant="heroOutline"
              size="lg"
              className="w-full sm:w-auto gap-3 text-base"
              onClick={() => window.open("https://paypal.com", "_blank")}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.603c-.564 0-1.04.408-1.13.964L7.076 21.337z"/>
              </svg>
              PayPal
            </Button>

            <Button
              variant="heroOutline"
              size="lg"
              className="w-full sm:w-auto gap-3 text-base"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.546zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.525 2.107c-.345-.087-.7-.168-1.053-.254l.53-2.12-1.314-.328-.54 2.152c-.286-.065-.567-.13-.84-.2l.001-.005-1.812-.453-.35 1.407s.975.224.955.238c.535.136.63.494.614.778l-.614 2.46c.037.01.085.025.138.047l-.14-.036-.86 3.444c-.065.16-.23.4-.6.31.013.02-.955-.238-.955-.238l-.652 1.514 1.71.426c.32.08.63.164.94.242l-.546 2.19 1.314.328.54-2.164c.36.1.71.19 1.05.273l-.538 2.155 1.315.33.546-2.18c2.24.424 3.93.253 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.867-.2 1.52-.77 1.694-1.94z"/>
              </svg>
              Bitcoin
            </Button>

            <Button
              variant="heroOutline"
              size="lg"
              className="w-full sm:w-auto gap-3 text-base"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14h-2v-2h2v2zm0-4h-2V7h2v5zm4 4h-2v-2h2v2zm0-4h-2V7h2v5z"/>
              </svg>
              Nequi
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
