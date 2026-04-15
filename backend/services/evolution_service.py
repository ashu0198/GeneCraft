import random
from Bio.Seq import Seq

def get_traits(dna_str):
    dna = Seq(dna_str)
    # Handle length not multiple of 3 using padding
    remainder = len(dna) % 3
    if remainder: dna += Seq("N" * (3 - remainder))
    
    mrna = str(dna.transcribe())
    try:
        protein = str(dna.translate(to_stop=True))
    except:
        protein = ""
        
    stability = sum(protein.count(aa) for aa in 'VLIF') * 2.5
    metabolism = sum(protein.count(aa) for aa in 'KRED') * 2.5
    resistance = sum(protein.count(aa) for aa in 'CMWY') * 3.5
    
    return {'mrna': mrna, 'protein': protein, 'stability': stability, 'metabolism': metabolism, 'resistance': resistance}

class DarwinEngine:
    def __init__(self):
        self.population = []
        self.generation = 0
        self.history = []
        self.latest_fitness_array = []
        self.env = {'temperature': 50, 'moisture': 50, 'pollution': 10}
        self.init_sim()
        
    def init_sim(self):
        self.generation = 1
        self.history = []
        # Robust basic sequence. Added some random diversity for base initial set
        base_seq = "ATGCGTACGGTGCTGTGTGAAGATTAA" * 2
        self.population = [base_seq for _ in range(10)]
        return self.get_state()
        
    def set_env(self, env):
        self.env.update(env)
        return self.get_state()
        
    def mutate_dna(self, organism_id, pos, new_base):
        if 0 <= organism_id < len(self.population):
            dna = list(self.population[organism_id])
            if 0 <= pos < len(dna):
                dna[pos] = new_base
                self.population[organism_id] = "".join(dna)
        return self.get_state()

    def apply_generation(self):
        t_factor = self.env['temperature'] / 50.0   # 0 to 2.0
        m_factor = self.env['moisture'] / 50.0      # 0 to 2.0
        p_factor = self.env['pollution'] / 50.0     # 0 to 2.0
        
        organisms = []
        total_fitness = 0
        
        for dna in self.population:
            t = get_traits(dna)
            # Fitness logic:
            fit = (t['stability'] * t_factor) + (t['metabolism'] * m_factor) + (t['resistance'] * p_factor)
            fit += 2.0 # baseline survival
            
            # Punishment for high pollution with low resistance
            if self.env['pollution'] > 60 and t['resistance'] < 4:
                fit *= 0.2
            if self.env['temperature'] > 80 and t['stability'] < 5:
                fit *= 0.4
                
            organisms.append({'dna': dna, 'fitness': fit})
            total_fitness += fit
            
        self.latest_fitness_array = [round(o['fitness'], 2) for o in organisms]
            
        avg_fitness = total_fitness / len(self.population) if self.population else 0
        self.history.append({"generation": self.generation, "size": len(self.population), "avg_fitness": round(avg_fitness, 2)})
        
        survivor_thresh = avg_fitness * 0.7
        survivors = [o for o in organisms if o['fitness'] >= survivor_thresh]
        
        new_pop = []
        if survivors:
            for org in survivors:
                # Reproduction rate based on fitness strength vs average
                offspring = int((org['fitness'] / avg_fitness) * 1.5) if avg_fitness > 0 else 1
                if offspring < 1: offspring = 1
                
                for _ in range(offspring):
                    if len(new_pop) >= 1000: break # Cap at 1000
                    
                    child = list(org['dna'])
                    mut_rate = 0.005 + (self.env['pollution'] / 2000.0) # Up to 5% per base at 100 pollution
                    
                    for i in range(len(child)):
                        if random.random() < mut_rate:
                            child[i] = random.choice(['A','T','G','C'])
                            
                    new_pop.append("".join(child))
                    
        self.population = new_pop
        self.generation += 1
        return self.get_state()
        
    def get_state(self):
        # Sample top 10 organisms to avoid huge payloads
        sample = self.population[:10]
        detailed_sample = []
        for dna in sample:
            t = get_traits(dna)
            detailed_sample.append({"dna": dna, "traits": t})
            
        return {
            "generation": self.generation,
            "population_size": len(self.population),
            "environment": self.env,
            "sample_organisms": detailed_sample,
            "all_fitness": self.latest_fitness_array,
            "history": self.history[-30:] # Last 30 gens for the graph
        }

# Global Singleton
engine = DarwinEngine()
