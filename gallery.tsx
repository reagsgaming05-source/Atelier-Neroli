import { render } from 'preact';
import { SceneArt } from './src/components/SceneArt';
const NEW = [['folk','day','plain'],['crowd','day','city'],['walkers','day','desert'],['workers','day','plain'],['caravan','dusk','desert'],['horse','day','plain'],['goat','day','mountains'],['gulls','day','sea'],['fish','day','sea'],['butterflies','day','garden'],['bats','night','cave'],['birds','day','plain']] as const;
render(
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '6px' }}>
    {NEW.map(([m, sky, ground]) => (
      <div key={m} style={{ width: '200px', color: '#fff', font: '12px sans-serif' }}>
        <div style={{ width: '200px', height: '240px' }}><SceneArt sky={sky as never} ground={ground as never} motifs={[m] as never} /></div>
        {m}
      </div>
    ))}
  </div>,
  document.getElementById('app')!,
);
